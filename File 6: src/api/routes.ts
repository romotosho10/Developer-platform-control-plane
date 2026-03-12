import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Service, DeploymentRequest, Environment } from '../types';
import { GitOpsGenerator } from '../gitops/generator';
import { KubernetesClient } from '../k8s/client';

const router = Router();
const services: Map<string, Service> = new Map();
const gitops = new GitOpsGenerator();
const k8s = new KubernetesClient();

router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'developer-platform-control-plane',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

router.post('/v1/services', async (req, res) => {
  try {
    const { name, repo, owner, environments = ['dev', 'staging'] } = req.body;

    if (!name || !repo || !owner) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, repo, owner' 
      });
    }

    const existing = Array.from(services.values()).find(s => s.name === name);
    if (existing) {
      return res.status(409).json({ error: 'Service already exists' });
    }

    const service: Service = {
      id: uuidv4(),
      name,
      repo,
      owner,
      createdAt: new Date(),
      environments: environments.map((env: string): Environment => ({
        name: env,
        namespace: `${name}-${env}`,
        status: 'pending'
      }))
    };

    services.set(service.id, service);

    for (const env of service.environments) {
      await k8s.createNamespace(env.namespace);
    }

    res.status(201).json({
      message: 'Service registered successfully',
      service: {
        id: service.id,
        name: service.name,
        repo: service.repo,
        environments: service.environments.map(e => ({
          name: e.name,
          namespace: e.namespace,
          status: e.status
        }))
      }
    });
  } catch (error: any) {
    console.error('Error registering service:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/v1/services', (req, res) => {
  const serviceList = Array.from(services.values()).map(s => ({
    id: s.id,
    name: s.name,
    repo: s.repo,
    owner: s.owner,
    createdAt: s.createdAt,
    environments: s.environments.map(e => ({
      name: e.name,
      status: e.status,
      deployedAt: e.deployedAt,
      gitSha: e.gitSha
    }))
  }));

  res.json({
    count: serviceList.length,
    services: serviceList
  });
});

router.get('/v1/services/:id', (req, res) => {
  const service = services.get(req.params.id);
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  res.json(service);
});

router.post('/v1/services/:id/deploy', async (req, res) => {
  try {
    const service = services.get(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const { environment, gitSha, metadata } = req.body as DeploymentRequest;
    
    const env = service.environments.find(e => e.name === environment);
    if (!env) {
      return res.status(400).json({ 
        error: `Environment ${environment} not found for this service` 
      });
    }

    env.gitSha = gitSha;
    env.status = 'deploying';
    env.deployedAt = new Date();

    const manifest = gitops.generateApplication(service, env);
    const manifestObj = JSON.parse(manifest);
    await k8s.applyArgoCDApplication(manifestObj);

    res.json({
      message: 'Deployment initiated',
      deployment: {
        service: service.name,
        environment: env.name,
        gitSha,
        namespace: env.namespace,
        argoApp: `${service.name}-${env.name}`,
        status: 'deploying',
        estimatedDuration: '2-3 minutes'
      },
      manifest: manifestObj
    });
  } catch (error: any) {
    console.error('Error deploying service:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/v1/services/:id/status', async (req, res) => {
  try {
    const service = services.get(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const statuses = await Promise.all(
      service.environments.map(async env => {
        const status = await k8s.getDeploymentStatus(service.name, env.name);
        return {
          environment: env.name,
          namespace: env.namespace,
          argoStatus: status?.status?.sync?.status || 'Unknown',
          health: status?.status?.health?.status || 'Unknown',
          lastSync: status?.status?.operationState?.finishedAt
        };
      })
    );

    res.json({
      service: service.name,
      environments: statuses
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/v1/services/:id/manifest', (req, res) => {
  const service = services.get(req.params.id);
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  const { environment } = req.body;
  const env = service.environments.find(e => e.name === environment);
  
  if (!env) {
    return res.status(400).json({ error: 'Environment not found' });
  }

  const manifest = gitops.generateManifest(service, env);
  const namespaceManifest = gitops.generateNamespaceManifest(env.namespace);

  res.set('Content-Type', 'text/yaml');
  res.send(`---\n${namespaceManifest}\n---\n${manifest}`);
});

router.delete('/v1/services/:id', (req, res) => {
  const service = services.get(req.params.id);
  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  services.delete(req.params.id);
  res.json({ message: 'Service deleted', name: service.name });
});

export default router;
          
