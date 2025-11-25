import { GoogleGenAI } from "@google/genai";
import { DashboardMetrics } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini Service: No API Key found in process.env.API_KEY");
    return null;
  }
  try {
      return new GoogleGenAI({ apiKey });
  } catch (error) {
      console.error("Gemini Service: Failed to initialize client", error);
      return null;
  }
};

export const generateExecutiveSummary = async (metrics: DashboardMetrics, context: string = "Global"): Promise<string> => {
  const client = getAiClient();
  if (!client) {
    return "AI Insights unavailable: Missing API Key configuration.";
  }

  const prompt = `
    You are a Senior Program Analyst for the Hedera Certification Program. 
    
    CONTEXT:
    The user is viewing the dashboard for: ${context === 'All' ? 'Global Overview (All Regions)' : context}.
    
    TASK:
    Analyze the provided metrics and generate an Executive Summary (max 3 sentences).
    Compare these metrics against a theoretical high-performing benchmark for developer certification programs.
    
    DATA:
    - Registered Developers: ${metrics.totalRegistered}
    - Certified Developers: ${metrics.totalCertified}
    - Certification Rate: ${metrics.certificationRate.toFixed(1)}%
    - Average Completion Time: ${metrics.avgCompletionTimeDays.toFixed(1)} days
    - Suspicious/Fraudulent Accounts: ${metrics.potentialFakeAccounts}
    - Active Communities involved: ${metrics.activeCommunities}

    INSTRUCTIONS:
    - If the context is "Global", focus on overall program health and fraud risk.
    - If the context is a specific region (e.g., "HEDERA-FR-PARIS"), provide specific feedback on that region's performance compared to general expectations.
    - Highlight any red flags (e.g. high fraud, low completion rate, zero certifications).
    - Tone: Professional, concise, executive.
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Analysis complete.";
  } catch (error) {
    console.error("Gemini API Error (generateExecutiveSummary):", error);
    return "Unable to generate AI insight. Please check API Key and quotas.";
  }
};

export const generateComparativeReport = async (
    communityName: string, 
    currentMetrics: DashboardMetrics, 
    prevMetrics: DashboardMetrics, 
    globalMetrics: DashboardMetrics
): Promise<string> => {
    const client = getAiClient();
    if (!client) return "AI Report unavailable: Missing API Key configuration.";

    const growthReg = ((currentMetrics.totalRegistered - prevMetrics.totalRegistered) / (prevMetrics.totalRegistered || 1)) * 100;
    const growthCert = ((currentMetrics.totalCertified - prevMetrics.totalCertified) / (prevMetrics.totalCertified || 1)) * 100;

    const prompt = `
    Generate a comparative performance report for the community: ${communityName}.
    
    Data Points:
    1. CURRENT PERIOD PERFORMANCE:
       - Registrations: ${currentMetrics.totalRegistered}
       - Certifications: ${currentMetrics.totalCertified}
       - Rate: ${currentMetrics.certificationRate.toFixed(1)}%

    2. PREVIOUS PERIOD COMPARISON (Growth):
       - Registration Growth: ${growthReg.toFixed(1)}%
       - Certification Growth: ${growthCert.toFixed(1)}%

    3. BENCHMARK (Global Average):
       - Global Certification Rate: ${globalMetrics.certificationRate.toFixed(1)}%
       - Global Avg Completion Time: ${globalMetrics.avgCompletionTimeDays.toFixed(1)} days
       - Community Avg Completion Time: ${currentMetrics.avgCompletionTimeDays.toFixed(1)} days

    Task:
    Write a 3-paragraph analysis.
    - Paragraph 1: Growth Analysis. Are they accelerating or slowing down compared to the previous period?
    - Paragraph 2: Benchmarking. How do they stack up against the Global Average? Are they faster/slower? More/less efficient?
    - Paragraph 3: Strategic Recommendation. What should this community manager do next month?

    Format: Markdown. Bold key stats.
    `;

    try {
        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        return response.text || "Report generation failed.";
    } catch (error) {
        console.error("Gemini API Error (generateComparativeReport):", error);
        return "Unable to generate Comparative Report. Please check API Key and quotas.";
    }
};