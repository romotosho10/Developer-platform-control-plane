Developer Platform Control Plane

Internal Developer Platform (IDP) enabling GitOps-driven microservice deployments
with automated CI/CD, environment management, and Kubernetes orchestration.
 Features

- Service Catalog: Register and manage microservices
- GitOps Integration: Auto-generates ArgoCD manifests
- Environment Promotion: Dev → Staging → Prod pipelines
- Self-Service: Developers deploy without ops tickets
- Real-time Dashboard: Monitor deployment status

Impact Metrics

- 80% reduction in deployment time
- 100% GitOps compliance — all changes tracked in git
- Zero-downtime deployments via ArgoCD rolling updates

 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open dashboard
open http://localhost:3000/dashboard

## API Documentation

See [TESTING.md](TESTING.md) for complete API examples and usage instructions.
