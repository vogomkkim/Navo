export interface ProjectRequest {
  name: string;
  description: string;
  type: 'web' | 'mobile' | 'api' | 'fullstack';
  features: string[];
  technology?: string;
  complexity?: 'low' | 'medium' | 'high';
  estimatedTime?: string | number;
}
