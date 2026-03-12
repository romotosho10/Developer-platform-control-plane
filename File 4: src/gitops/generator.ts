import * as yaml from 'js-yaml';
import { ArgoCDApplication, Service, Environment } from '../types';

export class GitOpsGenerator {
  private argoNamespace = 'argocd';

  generateApplication(service: Service, env: Environment): ArgoCDApplication {
    return {
      apiVersion: 'argoproj.io/v1alpha1',
      kind: 'Application',
      metadata: {
        name: `${service.name}-${env.name}`,
        namespace: this.argoNamespace,
        labels: {
          'app.kubernetes.io/name': service.name,
          'app.kubernetes.io/environment': env.name,
          'app.kubernetes.io/managed-by': 'developer-platform'
        }
      },
      spec: {
        project: 'default',
        source: {
          repoURL: service.repo,
          targetRevision: env.gitSha || 'HEAD',
          path: `k8s/${env.name}`,
        },
        destination: {
          server: 'https://kubernetes.default.svc',
          namespace: env.namespace,
        },
        syncPolicy: {
          automated: {
            prune: true,
            selfHeal: true,
          },
        },
      },
    };
  }

  generateManifest(service: Service, env: Environment): string {
    const app = this.generateApplication(service, env);
    return yaml.dump(app, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    });
  }

  generateNamespaceManifest(namespace: string): string {
    return yaml.dump({
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name: namespace,
        labels: {
          'app.kubernetes.io/managed-by': 'developer-platform',
          'istio-injection': 'enabled'
        }
      }
    });
  }
        }
      
