
import { DeveloperRecord, ChartDataPoint, MembershipMetrics, MembershipChartPoint } from '../types';

// Helper to check if a date falls within a specific date range
const isDateInRange = (dateStr: string | null, startDate: Date | null, endDate: Date | null): boolean => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;

    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;
    
    return true;
};

// Helper to calculate the "Previous Period"
export const getPreviousPeriod = (start: Date, end: Date): { start: Date, end: Date } => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const prevEnd = new Date(start);
    prevEnd.setDate(start.getDate() - 1);
    prevEnd.setHours(23, 59, 59, 999);

    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevEnd.getDate() - diffDays);
    prevStart.setHours(0, 0, 0, 0);

    return { start: prevStart, end: prevEnd };
};

// 2.2 / 3.1 AM/PM Fix Logic
const applyAmPmFix = (createdAt: string, completedAt: string | null): string | null => {
  if (!completedAt || !createdAt) return completedAt;

  const created = new Date(createdAt);
  let completed = new Date(completedAt);

  if (isNaN(created.getTime()) || isNaN(completed.getTime())) return completedAt;

  // PRD Logic: If Completed < Created, add 12 hours
  if (completed.getTime() < created.getTime()) {
    completed = new Date(completed.getTime() + 12 * 60 * 60 * 1000);
  }

  return completed.toISOString();
};

export const processIngestedData = (rawData: DeveloperRecord[]): DeveloperRecord[] => {
  // PRD 4.2 Module B: Fraud Engine (Sybil Check)
  // Logic: Group by Wallet Address. If count > 1 -> Tag all as "Sybil".
  const walletCounts = new Map<string, number>();
  rawData.forEach(r => {
      if(r.walletAddress && r.walletAddress.length > 5) { // Basic length check
          const w = r.walletAddress.trim().toLowerCase();
          if (w !== 'n/a' && w !== 'none' && w !== '') {
             walletCounts.set(w, (walletCounts.get(w) || 0) + 1);
          }
      }
  });

  // KNOWN DISPOSABLE DOMAINS
  const disposableDomains = [
      'yopmail.com', 'mailinator.com', 'temp-mail.org', 'guerrillamail.com', 
      '10minutemail.com', 'sharklasers.com', 'throwawaymail.com', 'getnada.com'
  ];

  return rawData.map((record) => {
    // 1. Sanitize & Fix Time
    const correctedCompletedAt = applyAmPmFix(record.createdAt, record.completedAt);
    
    const riskFlags: string[] = [];
    let computed_duration = 0;
    let dataError = false;

    // 2. Calculate Duration
    if (correctedCompletedAt && record.createdAt) {
        const start = new Date(record.createdAt).getTime();
        const end = new Date(correctedCompletedAt).getTime();
        
        if (!isNaN(start) && !isNaN(end)) {
            computed_duration = (end - start) / (1000 * 60 * 60); // Hours
            
            if (computed_duration < 0) {
                 dataError = true; // Still negative after fix
            }
        }
    }

    // 3. PRD Fraud Logic: Speed Run
    // If duration < 4 hours & Grade == 'Pass' -> Tag "Speed Run"
    if (!dataError && computed_duration > 0 && computed_duration < 4 && record.finalGrade === 'Pass') {
        if (computed_duration < 0.5) {
            riskFlags.push('Bot Activity');
        } else {
            riskFlags.push('Speed Run');
        }
    }

    // 4. PRD Fraud Logic: Sybil
    if (record.walletAddress && record.walletAddress.length > 5) {
        const w = record.walletAddress.trim().toLowerCase();
        const count = walletCounts.get(w) || 0;
        if (count > 1) {
            riskFlags.push(`Sybil`);
        }
    }

    // 5. Email Forensics (Identity)
    if (record.email) {
        const emailLower = record.email.toLowerCase();
        if (emailLower.includes('+')) {
            riskFlags.push('Email Alias');
        }
        const domain = emailLower.split('@')[1];
        if (domain && disposableDomains.includes(domain)) {
            riskFlags.push('Disposable Email');
        }
    }

    return {
        ...record,
        completedAt: correctedCompletedAt,
        computed_duration,
        computed_riskFlags: riskFlags,
        // Map legacy UI field for compatibility
        isSuspicious: riskFlags.length > 0, // Deprecated in favor of flags array but kept for UI
        suspicionReason: riskFlags.join(', '),
        dataError,
    };
  });
};

export const calculateDashboardMetrics = (data: DeveloperRecord[], startDate: Date | null, endDate: Date | null) => {
  const registeredInPeriod = data.filter(r => isDateInRange(r.createdAt, startDate, endDate));
  const totalRegistered = registeredInPeriod.length;

  const certifiedInPeriod = data.filter(r => r.finalGrade === 'Pass' && isDateInRange(r.completedAt, startDate, endDate));
  const totalCertified = certifiedInPeriod.length;
  
  const usersStarted = registeredInPeriod.filter(r => r.percentageCompleted > 0).length;
  const subscribers = registeredInPeriod.filter(r => r.acceptedMarketing).length;

  const uniqueCommunities = new Set(data.filter(r => isDateInRange(r.createdAt, startDate, endDate) || isDateInRange(r.completedAt, startDate, endDate))
                                        .map((r) => r.partnerCode)
                                        .filter(p => p && p !== 'UNKNOWN'));
  const activeCommunities = uniqueCommunities.size;

  const validCertifiedUsers = certifiedInPeriod.filter(r => 
    r.completedAt && 
    !r.dataError && 
    r.computed_duration !== undefined &&
    r.computed_duration > 0
  );
  
  let totalDuration = 0;
  validCertifiedUsers.forEach(curr => {
      totalDuration += (curr.computed_duration || 0);
  });
  
  const avgCompletionTimeDays = validCertifiedUsers.length > 0 
    ? (totalDuration / validCertifiedUsers.length) / 24 
    : 0;

  // PRD Metric: Potential Fake Accounts
  // "Count of users flagged by Speed Runs or Sybil" (computed_riskFlags > 0)
  const potentialFake = registeredInPeriod.filter(r => r.computed_riskFlags && r.computed_riskFlags.length > 0).length;

  const rapidCompletions = validCertifiedUsers.filter(r => 
    (r.computed_duration || 0) < 5
  ).length;

  return {
    totalRegistered,
    totalCertified,
    usersStartedCourse: usersStarted,
    usersStartedCoursePct: totalRegistered > 0 ? (usersStarted / totalRegistered) * 100 : 0,
    activeCommunities,
    avgCompletionTimeDays,
    certificationRate: totalRegistered > 0 ? (totalCertified / totalRegistered) * 100 : 0,
    overallSubscriberRate: totalRegistered > 0 ? (subscribers / totalRegistered) * 100 : 0,
    potentialFakeAccounts: potentialFake,
    potentialFakeAccountsPct: totalRegistered > 0 ? (potentialFake / totalRegistered) * 100 : 0,
    rapidCompletions
  };
};

export const generateChartData = (data: DeveloperRecord[], startDate: Date | null, endDate: Date | null): ChartDataPoint[] => {
    if (data.length === 0) return [];

    let granularity: 'Daily' | 'Weekly' = 'Weekly';
    if (startDate && endDate) {
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (diffDays <= 60) granularity = 'Daily';
    }

    const timeline: Record<string, { registrations: number; certifications: number; sortDate: number }> = {};

    const getGroupKey = (d: Date): { label: string, sortDate: number } => {
        const date = new Date(d);
        date.setHours(0,0,0,0);

        if (granularity === 'Daily') {
            return {
                label: date.toISOString(),
                sortDate: date.getTime()
            };
        } else {
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(date.setDate(diff));
            monday.setHours(0, 0, 0, 0);
            return {
                label: monday.toISOString(),
                sortDate: monday.getTime()
            };
        }
    };

    if (startDate && endDate) {
        let curr = new Date(startDate);
        while (curr <= endDate) {
            const { label, sortDate } = getGroupKey(curr);
            if (!timeline[label]) timeline[label] = { registrations: 0, certifications: 0, sortDate };
            curr.setDate(curr.getDate() + 1);
        }
    }

    data.forEach(record => {
        if (isDateInRange(record.createdAt, startDate, endDate)) {
            const regDate = new Date(record.createdAt);
            if (!isNaN(regDate.getTime())) {
                const { label, sortDate } = getGroupKey(regDate);
                if (!timeline[label]) timeline[label] = { registrations: 0, certifications: 0, sortDate };
                timeline[label].registrations++;
            }
        }

        if (record.finalGrade === 'Pass' && record.completedAt && isDateInRange(record.completedAt, startDate, endDate)) {
            const certDate = new Date(record.completedAt);
            if (!isNaN(certDate.getTime())) {
                const { label, sortDate } = getGroupKey(certDate);
                if (!timeline[label]) timeline[label] = { registrations: 0, certifications: 0, sortDate };
                timeline[label].certifications++;
            }
        }
    });

    const sortedData = Object.values(timeline)
        .sort((a, b) => a.sortDate - b.sortDate)
        .map(item => ({
            name: new Date(item.sortDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
            }),
            registrations: item.registrations,
            certifications: item.certifications
        }));

    if (!startDate && !endDate) {
        return sortedData.slice(-24);
    }

    return sortedData;
};

export const generateLeaderboard = (data: DeveloperRecord[]) => {
    const counts: Record<string, number> = {};
    data.forEach(r => {
        if (!r.partnerCode || r.partnerCode === 'UNKNOWN') return;
        if (r.finalGrade === 'Pass') {
            counts[r.partnerCode] = (counts[r.partnerCode] || 0) + 1;
        }
    });

    return Object.keys(counts)
        .map(key => ({ name: key, value: counts[key] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
};

export const calculateMembershipMetrics = (data: DeveloperRecord[], startDate: Date | null, endDate: Date | null): MembershipMetrics => {
    const enrolledInPeriod = data.filter(r => isDateInRange(r.createdAt, startDate, endDate));
    const totalEnrolled = enrolledInPeriod.length;
    
    // PRD: "Onboarded Members: Count of acceptedMembership = true"
    const members = enrolledInPeriod.filter(r => r.acceptedMembership);
    const totalMembers = members.length;
    
    // PRD: "Certified Members: Count of members who also Passed"
    const certifiedMembers = members.filter(r => r.finalGrade === 'Pass').length;
    
    const activeCommunities = new Set(members.map(r => r.partnerCode).filter(p => p && p !== 'UNKNOWN')).size;

    return {
        totalEnrolled,
        totalMembers,
        membershipRate: totalEnrolled > 0 ? (totalMembers / totalEnrolled) * 100 : 0,
        certifiedMembers,
        certifiedMemberRate: totalMembers > 0 ? (certifiedMembers / totalMembers) * 100 : 0,
        activeCommunities
    };
};

export const generateMembershipChartData = (data: DeveloperRecord[], startDate: Date | null, endDate: Date | null): MembershipChartPoint[] => {
    if (data.length === 0) return [];
    let granularity: 'Daily' | 'Weekly' = 'Weekly';
    if (startDate && endDate) {
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (diffDays <= 60) granularity = 'Daily';
    }
    const timeline: Record<string, { enrollees: number; newMembers: number; sortDate: number }> = {};
    const getGroupKey = (d: Date) => {
        const date = new Date(d);
        date.setHours(0,0,0,0);
        if (granularity === 'Daily') {
            return { label: date.toISOString(), sortDate: date.getTime() };
        } else {
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(date.setDate(diff));
            monday.setHours(0, 0, 0, 0);
            return { label: monday.toISOString(), sortDate: monday.getTime() };
        }
    };
    data.forEach(record => {
        if (isDateInRange(record.createdAt, startDate, endDate)) {
            const regDate = new Date(record.createdAt);
            if (!isNaN(regDate.getTime())) {
                const { label, sortDate } = getGroupKey(regDate);
                if (!timeline[label]) timeline[label] = { enrollees: 0, newMembers: 0, sortDate };
                timeline[label].enrollees++;
                if (record.acceptedMembership) {
                    timeline[label].newMembers++;
                }
            }
        }
    });
    const sorted = Object.values(timeline)
        .sort((a, b) => a.sortDate - b.sortDate)
        .map(item => ({
            name: new Date(item.sortDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            enrollees: item.enrollees,
            newMembers: item.newMembers
        }));
     if (!startDate && !endDate) return sorted.slice(-24);
     return sorted;
};
