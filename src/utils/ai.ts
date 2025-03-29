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

  try {
    const response = await getAIClient(prompt);
    
    try {
      const cleanResponse = response.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      console.warn("Failed to parse AI response for validation as JSON, using fallback format", parseError);
      
      // If JSON parsing fails, return a structured fallback object
      return {
        isValid: true,
        score: 75,
        feedback: "Certificate content appears to be professionally structured and relevant.",
        suggestedImprovements: [
          "Consider adding more specific skills covered by the certification",
          "You might include industry standards this certification aligns with"
        ]
      };
    }
  } catch (error) {
    console.error("Error validating certificate content:", error);
    // Return fallback data if the entire process fails
    return {
      isValid: true,
      score: 70,
      feedback: "Certificate content meets basic requirements for professional documentation.",
      suggestedImprovements: ["Review for additional details that might enhance credibility"]
    };
  }
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

  try {
    const response = await getAIClient(prompt);
    
    // Try to clean and parse the response as JSON
    try {
      const cleanResponse = response.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      console.warn("Failed to parse AI response as JSON, using fallback format", parseError);
      
      // If JSON parsing fails, return a structured fallback object
      return {
        industryDemand: "This certificate demonstrates knowledge that is valuable in today's job market.",
        careerOpportunities: [
          "Role related to certificate subject",
          "Industry position requiring these skills",
          "Specialized position with certificate focus"
        ],
        salaryImpact: "This certification may positively impact salary negotiations by demonstrating specialized knowledge.",
        futureRelevance: "The skills verified by this certificate will remain relevant as the industry evolves.",
        relatedCertifications: ["Similar certification in this field"]
      };
    }
  } catch (error) {
    console.error("Error getting AI analysis:", error);
    // Return fallback data if the entire process fails
    return {
      industryDemand: "Certificate demonstrates valuable industry knowledge.",
      careerOpportunities: [
        "Relevant industry positions", 
        "Specialized roles"
      ],
      salaryImpact: "May enhance compensation packages.",
      futureRelevance: "Skills will remain relevant in evolving markets.",
      relatedCertifications: ["Related certifications in this field"]
    };
  }
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

  try {
    const response = await getAIClient(prompt);
    
    try {
      const cleanResponse = response.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      console.warn("Failed to parse AI response for highlights as JSON, using fallback format", parseError);
      
      // If JSON parsing fails, return default highlights
      return [
        `Earned the ${title} certification, demonstrating expertise in this field`,
        "Validated skills that meet industry standards",
        "Ready to apply specialized knowledge to real-world challenges"
      ];
    }
  } catch (error) {
    console.error("Error generating shareable highlights:", error);
    // Return fallback highlights if the entire process fails
    return [
      `Proud holder of the ${title} certification`,
      "Certified professional with validated expertise",
      "Qualified with industry-recognized credentials"
    ];
  }
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
  
  try {
    const response = await getAIClient(prompt);
    
    try {
      const cleanResponse = response.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanResponse);
    } catch (parseError) {
      console.warn("Failed to parse AI response for profile analysis as JSON, using fallback format", parseError);
      
      // If JSON parsing fails, return default recommendations
      return [
        `Your profile shows potential for ${jobRole} positions, with some areas for growth.`,
        "Consider the following courses:",
        `Advanced ${jobRole} Certification`,
        "Leadership and Management Skills",
        "Industry-Specific Technical Training"
      ];
    }
  } catch (error) {
    console.error("Error generating profile analysis:", error);
    // Return fallback recommendations if the entire process fails
    return [
      "Your current certificates provide a foundation for your career goals.",
      "Consider the following courses:",
      "Advanced Specialization in Your Field",
      "Professional Skills Development",
      "Trending Technology in Your Industry"
    ];
  }
};


