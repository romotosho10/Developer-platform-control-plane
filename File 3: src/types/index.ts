export interface Service {
  id: string;
  name: string;
  repo: string;
  owner: string;
  createdAt: Date;
  environments: Environment[];
}

export interface Environment {
  name: 'dev' | 'staging' | 'prod';
  namespace: string;
  deployedAt?: Date;
  gitSha?: string;
  status: 'pending' | 'deploying' | 'deployed' | 'failed';
}

export interface DeploymentRequest {
  serviceName: string;
  environment: string;
  gitSha: string;
  metadata?: Record<string, any>;
}

export interface ArgoCDApplication {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    project: string;
    source: {
      repoURL: string;
      targetRevision: string;
      path: string;
    };
    destination: {
      server: string;
      namespace: string;
    };
    syncPolicy: {
      automated: {
        prune: boolean;
        selfHeal: boolean;
      };
    };
  };
  }
  
