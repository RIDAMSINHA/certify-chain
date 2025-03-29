const EDGE_FUNCTION_URL =
  "https://peatdsafjrwjoimjmugm.supabase.co/functions/v1/ai-helper";

// In-memory cache for responses keyed by prompt.
const cache: Map<string, string> = new Map();

// Function to fetch from the edge function with retry logic.
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2,
  delay = 2000
): Promise<Response> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        // If rate limited, wait and retry.
        if (response.status === 429 && attempt < maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, delay * Math.pow(2, attempt))
          );
          attempt++;
          continue;
        }
        const errorData = await response.json();
        throw new Error(`Edge Function Error: ${errorData.error}`);
      }
      return response;
    } catch (err) {
      if (attempt === maxRetries - 1) {
        throw err;
      }
      // Wait with exponential backoff before retrying.
      await new Promise((resolve) =>
        setTimeout(resolve, delay * Math.pow(2, attempt))
      );
      attempt++;
    }
  }
  throw new Error("Unable to fetch after retries.");
}

// Function to get the AI client with caching.
export const getAIClient = async (prompt: string): Promise<string> => {
  // Return cached result if available.
  if (cache.has(prompt)) {
    return cache.get(prompt)!;
  }

  const response = await fetchWithRetry(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYXRkc2FmanJ3am9pbWptdWdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4MTQ0ODYsImV4cCI6MjA1NTM5MDQ4Nn0.EzdiddAq24zmYWnFaBC2oORvrskqA3EWYpbdcNpKjjI",
    },
    // Send the prompt in the request body.
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json();
  const result = data.result;
  // Cache the result for this prompt.
  cache.set(prompt, result);
  return result;
};

export const generateCertificateDescription = async (
  title: string
): Promise<string> => {
  const prompt = `Generate a professional certificate description for a "${title}" certificate. 
    Keep it concise (2-3 sentences), professional, and highlight the value of this certification in the industry.`;

  return getAIClient(prompt);
};

export const validateCertificateContent = async (
  title: string,
  description: string
): Promise<any> => {
  const prompt = `Analyze this certificate content and provide feedback:
    Title: ${title}
    Description: ${description}
    
    Check for:
    1. Professionalism
    2. Clarity
    3. Industry relevance
    4. Any potential improvements
    
    Return a JSON object with the following structure:
    {
      "isValid": boolean,
      "score": number (0-100),
      "feedback": string,
      "suggestedImprovements": string[]
    }`;

  const response = await getAIClient(prompt);
  const cleanResponse = response.replace(/```json|```/g, "").trim();
  return JSON.parse(cleanResponse);
};

export const analyzeCertificateValue = async (
  title: string,
  description: string
): Promise<any> => {
  const prompt = `Analyze this certificate's market value and career impact:
    Title: ${title}
    Description: ${description}
    
    Provide insights on:
    1. Industry demand
    2. Career opportunities
    3. Salary impact
    4. Future relevance
    
    Return a JSON object with:
    {
      "industryDemand": string,
      "careerOpportunities": string[],
      "salaryImpact": string,
      "futureRelevance": string,
      "relatedCertifications": string[]
    }`;

  const response = await getAIClient(prompt);
  const cleanResponse = response.replace(/```json|```/g, "").trim();
  return JSON.parse(cleanResponse);
};

export const generateShareableHighlights = async (
  title: string,
  description: string
): Promise<any> => {
  const prompt = `Create social media friendly highlights for this certificate:
    Title: ${title}
    Description: ${description}
    
    Generate 3-4 short, impactful bullet points that highlight the value of this certification.
    Return as a JSON array of strings.`;

  const response = await getAIClient(prompt);
  const cleanResponse = response.replace(/```json|```/g, "").trim();
  return JSON.parse(cleanResponse);
};

export const userProfileAIAnalysis = async (
  data: string,
  jobRole: string
) : Promise<any> => {
  const prompt = `Generate a 3-4 lines recommendation for what further courses should the user study to enhance his/her scope in this competitive job market if he/she is applying for job ${jobRole}, given that he/she have the following certificates: ${data} 
  Return data in format " 1 liner critique of the current profile
  Consider the following courses:,
  Relevant Courses (in different lines) (maximum 3) (no markdown)"
  Return as a JSON array of strings.`;
  
  const response = await getAIClient(prompt);
  const cleanResponse = response.replace(/```json|```/g, "").trim();
  return JSON.parse(cleanResponse);
}


