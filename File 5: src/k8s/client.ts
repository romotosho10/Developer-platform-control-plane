import * as k8s from '@kubernetes/client-node';
import { Service, Environment } from '../types';

export class KubernetesClient {
  private kc: k8s.KubeConfig;
  private k8sApi: k8s.CoreV1Api;
  private customApi: k8s.CustomObjectsApi;

  constructor() {
    this.kc = new k8s.KubeConfig();
    
    try {
      this.kc.loadFromCluster();
    } catch {
      this.kc.loadFromDefault();
    }

    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.customApi = this.kc.makeApiClient(k8s.CustomObjectsApi);
  }

  async createNamespace(namespace: string): Promise<void> {
    try {
      await this.k8sApi.createNamespace({
        metadata: {
          name: namespace,
          labels: {
            'app.kubernetes.io/managed-by': 'developer-platform'
          }
        }
      });
      console.log(`Created namespace: ${namespace}`);
    } catch (err: any) {
      if (err.response?.body?.reason === 'AlreadyExists') {
        console.log(`Namespace ${namespace} already exists`);
        return;
      }
      throw err;
    }
  }

  async applyArgoCDApplication(manifest: any): Promise<void> {
    const group = 'argoproj.io';
    const version = 'v1alpha1';
    const plural = 'applications';

    try {
      await this.customApi.createNamespacedCustomObject(
        group,
        version,
        'argocd',
        plural,
        manifest
      );
      console.log(`Created ArgoCD app: ${manifest.metadata.name}`);
    } catch (err: any) {
      if (err.response?.body?.reason === 'AlreadyExists') {
        await this.customApi.replaceNamespacedCustomObject(
          group,
          version,
          'argocd',
          manifest.metadata.name,
          plural,
          manifest
        );
        console.log(`Updated ArgoCD app: ${manifest.metadata.name}`);
        return;
      }
      throw err;
    }
  }

  async getDeploymentStatus(serviceName: string, env: string): Promise<any> {
    try {
      const group = 'argoproj.io';
      const version = 'v1alpha1';
      const plural = 'applications';
      
      const { body } = await this.customApi.getNamespacedCustomObject(
        group,
        version,
        'argocd',
        plural,
        `${serviceName}-${env}`
      );
      
      return body;
    } catch (err) {
      return null;
    }
  }

  async listServices(): Promise<any[]> {
    const { body } = await this.k8sApi.listNamespace();
    return body.items
      .filter(ns => ns.metadata?.labels?.['app.kubernetes.io/managed-by'] === 'developer-platform')
      .map(ns => ({
        namespace: ns.metadata?.name,
        createdAt: ns.metadata?.creationTimestamp
      }));
  }
          }

