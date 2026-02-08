import { tool } from "@kilocode/plugin"

/**
## Kilo Cloud API

This tool provides access to Kilo Cloud API endpoints via tRPC.

All endpoints require `KILO_API_KEY` environment variable to be set.

Example usage:
- List webhooks: kilo-cloud("webhookTriggers.list", {})
- Get webhook: kilo-cloud("webhookTriggers.get", {"triggerId": "my-trigger"})
- Create webhook: kilo-cloud("webhookTriggers.create", {"triggerId": "my-trigger", "githubRepo": "owner/repo", ...})

Troubleshooting:
- When parameters are wrong, check the `cloud` repository, grep for `Procedure` in `src/routers` to find the expected parameters and their types.
- See https://github.com/Kilo-Org/cloud
 */

const baseUrl = "https://app.kilo.ai/api/trpc"
const headers = {
  "Authorization": `Bearer ${process.env.KILO_API_KEY}`,
  "Content-Type": "application/json"
}

// Type definitions for endpoint configuration
type HttpMethod = 'GET' | 'POST'

interface EndpointConfig {
  name: string
  method: HttpMethod
  description: string
  params?: string
}

// Factory function to create procedure executors
const createProcedure = (namespace: string, name: string, method: HttpMethod, description: string, paramSchema?: string) => ({
  method,
  path: `/${namespace}.${name}`,
  description: `${description}${paramSchema ? ` Parameters: ${paramSchema}` : ''}`,
  execute: async (params: any) => {
    if (method === 'GET') {
      const wrappedParams = { batch: 1, input: params || {} }
      const input = encodeURIComponent(JSON.stringify(wrappedParams))
      const response = await fetch(`${baseUrl}/${namespace}.${name}?input=${input}`, { method, headers })
      return response.json()
    } else {
      const response = await fetch(`${baseUrl}/${namespace}.${name}`, {
        method,
        headers,
        body: JSON.stringify(params || {})
      })
      return response.json()
    }
  }
})

// Declarative endpoint definitions
const endpointDefinitions: Record<string, EndpointConfig[]> = {
  webhookTriggers: [
    { name: 'list', method: 'GET', description: 'List all webhook triggers.' },
    { name: 'get', method: 'GET', description: 'Get webhook trigger details.', params: 'triggerId (string, required), organizationId (string, optional)' },
    { name: 'listRequests', method: 'GET', description: 'List webhook requests.', params: 'triggerId (string, required), limit (number, optional)' },
    { name: 'create', method: 'POST', description: 'Create webhook trigger.', params: 'triggerId (string, required), githubRepo (string, required), mode (string, required, one of: architect|code|ask|debug|orchestrator, default: code), model (string, required, e.g. minimax/minimax-m2.1:free), promptTemplate (string, required), profileId (string, required - fetch from agentProfiles.list first)' },
    { name: 'update', method: 'POST', description: 'Update webhook trigger.', params: 'triggerId (string, required), isActive, githubRepo, mode, model, promptTemplate, etc.' },
    { name: 'delete', method: 'POST', description: 'Delete webhook trigger.', params: 'triggerId (string, required)' }
  ],
  cloudAgent: [
    { name: 'checkEligibility', method: 'GET', description: 'Check cloud agent eligibility.' },
    { name: 'prepareSession', method: 'POST', description: 'Prepare cloud agent session.', params: 'sessionId, mode, profileId, githubRepo' },
    { name: 'getStreamTicket', method: 'POST', description: 'Get stream ticket for cloud agent session.', params: 'sessionId (string, required)' },
    { name: 'getSessionStatus', method: 'GET', description: 'Get cloud agent session status.', params: 'sessionId (string, required)' },
    { name: 'deleteSession', method: 'POST', description: 'Delete cloud agent session.', params: 'sessionId (string, required)' },
    { name: 'getSession', method: 'GET', description: 'Get cloud agent session.', params: 'sessionId (string, required)' },
    { name: 'listGitHubRepositories', method: 'GET', description: 'List GitHub repositories for cloud agent.' },
    { name: 'listGitLabRepositories', method: 'GET', description: 'List GitLab repositories for cloud agent.' },
    { name: 'interruptSession', method: 'POST', description: 'Interrupt cloud agent session.', params: 'sessionId (string, required)' },
    { name: 'sendMessageStream', method: 'POST', description: 'Send message stream to cloud agent.', params: 'sessionId, message' },
    { name: 'sendMessageV2', method: 'POST', description: 'Send message V2 to cloud agent.', params: 'sessionId, message' },
    { name: 'initiateSessionStream', method: 'POST', description: 'Initiate cloud agent session stream.', params: 'githubRepo, prompt, mode, profileId' },
    { name: 'initiateFromKilocodeSessionStream', method: 'POST', description: 'Initiate from Kilocode session stream.', params: 'kilocodeSessionId' },
    { name: 'initiateFromKilocodeSessionV2', method: 'POST', description: 'Initiate from Kilocode session V2.', params: 'kilocodeSessionId, mode' },
    { name: 'prepareLegacySession', method: 'POST', description: 'Prepare legacy cloud agent session.', params: 'githubRepo, prompt, mode, profileId' },
    { name: 'checkDemoRepositoryFork', method: 'GET', description: 'Check demo repository fork status.' }
  ],
  cloudAgentNext: [
    { name: 'prepareSession', method: 'POST', description: 'Prepare cloud agent next session.', params: 'sessionId, mode, profileId' },
    { name: 'getStreamTicket', method: 'POST', description: 'Get stream ticket for cloud agent next session.', params: 'sessionId (string, required)' },
    { name: 'getSession', method: 'GET', description: 'Get cloud agent next session.', params: 'sessionId (string, required)' },
    { name: 'initiateFromPreparedSession', method: 'POST', description: 'Initiate from prepared session.', params: 'sessionId' },
    { name: 'interruptSession', method: 'POST', description: 'Interrupt cloud agent next session.', params: 'sessionId (string, required)' },
    { name: 'listGitHubRepositories', method: 'GET', description: 'List GitHub repositories for cloud agent next.' },
    { name: 'listGitLabRepositories', method: 'GET', description: 'List GitLab repositories for cloud agent next.' },
    { name: 'sendMessage', method: 'POST', description: 'Send message to cloud agent next.', params: 'sessionId, message' }
  ],
  cliSessions: [
    { name: 'list', method: 'GET', description: 'List all CLI sessions.' },
    { name: 'get', method: 'GET', description: 'Get CLI session details.', params: 'session_id (string, required)' },
    { name: 'create', method: 'POST', description: 'Create CLI session.', params: 'sessionId, mode, model, profileId' },
    { name: 'createV2', method: 'POST', description: 'Create CLI session V2.', params: 'sessionId, mode, model, profileId' },
    { name: 'update', method: 'POST', description: 'Update CLI session.', params: 'sessionId, status, etc.' },
    { name: 'delete', method: 'POST', description: 'Delete CLI session.', params: 'sessionId (string, required)' },
    { name: 'fork', method: 'POST', description: 'Fork CLI session.', params: 'sessionId, title' },
    { name: 'forkForReview', method: 'POST', description: 'Fork CLI session for review.', params: 'sessionId, title' },
    { name: 'search', method: 'GET', description: 'Search CLI sessions.', params: 'query' },
    { name: 'share', method: 'POST', description: 'Share CLI session.', params: 'sessionId' },
    { name: 'shareForWebhookTrigger', method: 'POST', description: 'Share CLI session for webhook trigger.', params: 'sessionId, triggerId' },
    { name: 'getSessionMessages', method: 'GET', description: 'Get CLI session messages.', params: 'sessionId' },
    { name: 'getSessionApiConversationHistory', method: 'GET', description: 'Get CLI session API conversation history.', params: 'sessionId' },
    { name: 'getSessionGitState', method: 'GET', description: 'Get CLI session git state.', params: 'sessionId' },
    { name: 'getByCloudAgentSessionId', method: 'GET', description: 'Get CLI session by cloud agent session ID.', params: 'cloudAgentSessionId' },
    { name: 'linkCloudAgent', method: 'POST', description: 'Link cloud agent to CLI session.', params: 'sessionId, cloudAgentSessionId' }
  ],
  cliSessionsV2: [
    { name: 'list', method: 'GET', description: 'List all CLI sessions (v2).' },
    { name: 'get', method: 'GET', description: 'Get CLI session details (v2).', params: 'sessionId (string, required)' },
    { name: 'getSessionMessages', method: 'GET', description: 'Get CLI session V2 messages.', params: 'sessionId' },
    { name: 'getByCloudAgentSessionId', method: 'GET', description: 'Get CLI session V2 by cloud agent session ID.', params: 'cloudAgentSessionId' },
    { name: 'getWithRuntimeState', method: 'GET', description: 'Get CLI session V2 with runtime state.', params: 'sessionId' }
  ],
  agentProfiles: [
    { name: 'list', method: 'GET', description: 'List all agent profiles.' },
    { name: 'get', method: 'GET', description: 'Get agent profile details.', params: 'id (string, required)' },
    { name: 'create', method: 'POST', description: 'Create agent profile.', params: 'name, envVars' },
    { name: 'update', method: 'POST', description: 'Update agent profile.', params: 'id (string, required), name, envVars, etc.' },
    { name: 'delete', method: 'POST', description: 'Delete agent profile.', params: 'id (string, required)' },
    { name: 'setVar', method: 'POST', description: 'Set agent profile variable.', params: 'id, key, value' },
    { name: 'deleteVar', method: 'POST', description: 'Delete agent profile variable.', params: 'id, key' },
    { name: 'setAsDefault', method: 'POST', description: 'Set agent profile as default.', params: 'id' },
    { name: 'clearDefault', method: 'POST', description: 'Clear agent profile default.' },
    { name: 'setCommands', method: 'POST', description: 'Set agent profile commands.', params: 'id, commands' },
    { name: 'listCombined', method: 'GET', description: 'List combined agent profiles.' }
  ],
  codeIndexing: [
    { name: 'search', method: 'GET', description: 'Search code index.', params: 'query (string, required), organizationId, repositoryId' },
    { name: 'getManifest', method: 'GET', description: 'Get code index manifest.', params: 'repositoryId (string, required)' },
    { name: 'isEnabled', method: 'GET', description: 'Check if code indexing is enabled.', params: 'repositoryId (string, required)' },
    { name: 'upsertByFile', method: 'POST', description: 'Upsert code index by file.', params: 'repositoryId, filePath, content' },
    { name: 'delete', method: 'POST', description: 'Delete code index.', params: 'repositoryId (string, required)' }
  ],
  codeIndexingCodeIndexing: [
    { name: 'search', method: 'GET', description: 'Search code index.', params: 'query, organizationId, repositoryId' },
    { name: 'getManifest', method: 'GET', description: 'Get code index manifest.', params: 'repositoryId' },
    { name: 'getOrganizationStats', method: 'GET', description: 'Get code indexing organization stats.' },
    { name: 'getProjectFiles', method: 'GET', description: 'Get code indexing project files.', params: 'repositoryId' },
    { name: 'delete', method: 'POST', description: 'Delete code index.', params: 'repositoryId' },
    { name: 'deleteBeforeDate', method: 'POST', description: 'Delete code index before date.', params: 'date' }
  ],
  organizations: [
    { name: 'list', method: 'GET', description: 'List all organizations.' },
    { name: 'get', method: 'GET', description: 'Get organization details.', params: 'id (string, required)' },
    { name: 'getUsageDetails', method: 'GET', description: 'Get organization usage details.', params: 'id (string, required)' },
    { name: 'getSettings', method: 'GET', description: 'Get organization settings.', params: 'id (string, required)' },
    { name: 'updateSettings', method: 'POST', description: 'Update organization settings.', params: 'id (string, required), settings' },
    { name: 'listMembers', method: 'GET', description: 'List organization members.', params: 'id (string, required)' },
    { name: 'inviteMember', method: 'POST', description: 'Invite member to organization.', params: 'id (string, required), email, role' },
    { name: 'removeMember', method: 'POST', description: 'Remove member from organization.', params: 'id (string, required), userId' },
    { name: 'getAuditLog', method: 'GET', description: 'Get organization audit log.', params: 'id (string, required)' },
    { name: 'create', method: 'POST', description: 'Create organization.', params: 'name' }
  ],
  organizationsOrganizationSubscription: [
    { name: 'getByStripeSessionId', method: 'GET', description: 'Get subscription by Stripe session ID.', params: 'stripeSessionId' },
    { name: 'getSubscriptionStripeUrl', method: 'GET', description: 'Get subscription Stripe URL.', params: 'organizationId' }
  ],
  user: [
    { name: 'getAuthProviders', method: 'GET', description: 'Get user auth providers.' },
    { name: 'generateApiToken', method: 'POST', description: 'Generate new API token.' },
    { name: 'getAutoTopUpPaymentMethod', method: 'GET', description: 'Get auto top-up payment method.' },
    { name: 'changeAutoTopUpPaymentMethod', method: 'POST', description: 'Change auto top-up payment method.', params: 'paymentMethodId' },
    { name: 'removeAutoTopUpPaymentMethod', method: 'POST', description: 'Remove auto top-up payment method.', params: 'paymentMethodId' },
    { name: 'toggleAutoTopUp', method: 'POST', description: 'Toggle auto top-up.', params: 'enabled' },
    { name: 'updateAutoTopUpAmount', method: 'POST', description: 'Update auto top-up amount.', params: 'amount' },
    { name: 'getCreditBlocks', method: 'GET', description: 'Get user credit blocks.' },
    { name: 'resetAPIKey', method: 'POST', description: 'Reset API key.' },
    { name: 'getAutocompleteMetrics', method: 'GET', description: 'Get autocomplete metrics.' },
    { name: 'linkAuthProvider', method: 'POST', description: 'Link auth provider.', params: 'provider' },
    { name: 'unlinkAuthProvider', method: 'POST', description: 'Unlink auth provider.', params: 'provider' }
  ],
  kiloPass: [
    { name: 'getState', method: 'GET', description: 'Get Kilo Pass state.' },
    { name: 'createCheckoutSession', method: 'POST', description: 'Create checkout session.', params: 'priceId' },
    { name: 'getCheckoutReturnState', method: 'GET', description: 'Get checkout return state.', params: 'sessionId' },
    { name: 'getCustomerPortalUrl', method: 'GET', description: 'Get customer portal URL.' },
    { name: 'cancelSubscription', method: 'POST', description: 'Cancel subscription.' },
    { name: 'resumeSubscription', method: 'POST', description: 'Resume subscription.' },
    { name: 'scheduleChange', method: 'POST', description: 'Schedule subscription change.', params: 'priceId' },
    { name: 'cancelScheduledChange', method: 'POST', description: 'Cancel scheduled change.' },
    { name: 'getScheduledChange', method: 'GET', description: 'Get scheduled change.' },
    { name: 'getAverageMonthlyUsageLast3Months', method: 'GET', description: 'Get average monthly usage last 3 months.' },
    { name: 'getFirstMonthPromoEligibility', method: 'GET', description: 'Get first month promo eligibility.' }
  ],
  byok: [
    { name: 'list', method: 'GET', description: 'List all BYOK (Bring Your Own Key) entries.' },
    { name: 'create', method: 'POST', description: 'Create BYOK entry.', params: 'provider_id, api_key' },
    { name: 'update', method: 'POST', description: 'Update BYOK entry.', params: 'id (string, required), api_key' },
    { name: 'delete', method: 'POST', description: 'Delete BYOK entry.', params: 'id (string, required)' }
  ],
  autoTriage: [
    { name: 'listTicketsForUser', method: 'GET', description: 'List auto triage tickets for user.' },
    { name: 'getTicket', method: 'GET', description: 'Get auto triage ticket details.', params: 'ticketId (string, required)' },
    { name: 'create', method: 'POST', description: 'Create auto triage ticket.', params: 'title, description, githubRepo' },
    { name: 'checkDuplicates', method: 'POST', description: 'Check for duplicate auto triage tickets.', params: 'title (string, required)' }
  ],
  autoFix: [
    { name: 'listTicketsForUser', method: 'GET', description: 'List auto fix tickets for user.' },
    { name: 'getTicket', method: 'GET', description: 'Get auto fix ticket details.', params: 'ticketId (string, required)' },
    { name: 'create', method: 'POST', description: 'Create auto fix request.', params: 'title, description, githubRepo, issueNumber' }
  ],
  autoFixAutoFix: [
    { name: 'listTicketsForUser', method: 'GET', description: 'List auto fix tickets for user.' },
    { name: 'getTicket', method: 'GET', description: 'Get auto fix ticket details.', params: 'ticketId' },
    { name: 'cancel', method: 'POST', description: 'Cancel auto fix ticket.', params: 'ticketId' },
    { name: 'retrigger', method: 'POST', description: 'Retrigger auto fix ticket.', params: 'ticketId' }
  ],
  autoTriageAutoTriage: [
    { name: 'listTicketsForUser', method: 'GET', description: 'List auto triage tickets for user.' },
    { name: 'getTicket', method: 'GET', description: 'Get auto triage ticket details.', params: 'ticketId' },
    { name: 'retrigger', method: 'POST', description: 'Retrigger auto triage ticket.', params: 'ticketId' }
  ],
  codeReviews: [
    { name: 'listForUser', method: 'GET', description: 'List code reviews for user.' },
    { name: 'get', method: 'GET', description: 'Get code review details.', params: 'reviewId (string, required)' },
    { name: 'requestReview', method: 'POST', description: 'Request code review.', params: 'githubRepo, prNumber' },
    { name: 'cancel', method: 'POST', description: 'Cancel code review.', params: 'reviewId (string, required)' },
    { name: 'retrigger', method: 'POST', description: 'Retrigger code review.', params: 'reviewId (string, required)' },
    { name: 'getGitHubStatus', method: 'GET', description: 'Get GitHub status for code reviews.' },
    { name: 'getReviewConfig', method: 'GET', description: 'Get code review config.' },
    { name: 'saveReviewConfig', method: 'POST', description: 'Save code review config.', params: 'config' },
    { name: 'toggleReviewAgent', method: 'POST', description: 'Toggle review agent.', params: 'enabled' },
    { name: 'listGitHubRepositories', method: 'GET', description: 'List GitHub repositories for code reviews.' }
  ],
  appBuilder: [
    { name: 'listProjects', method: 'GET', description: 'List app builder projects.' },
    { name: 'getProject', method: 'GET', description: 'Get app builder project details.', params: 'id (string, required)' },
    { name: 'createProject', method: 'POST', description: 'Create app builder project.', params: 'name, template' },
    { name: 'deploy', method: 'POST', description: 'Deploy app builder project.', params: 'projectId (string, required)' },
    { name: 'checkEligibility', method: 'GET', description: 'Check app builder eligibility.' },
    { name: 'deleteProject', method: 'POST', description: 'Delete app builder project.', params: 'projectId' },
    { name: 'deployProject', method: 'POST', description: 'Deploy app builder project.', params: 'projectId' },
    { name: 'startSession', method: 'POST', description: 'Start app builder session.', params: 'projectId' },
    { name: 'interruptSession', method: 'POST', description: 'Interrupt app builder session.', params: 'projectId' },
    { name: 'sendMessage', method: 'POST', description: 'Send message to app builder.', params: 'projectId, message' },
    { name: 'getPreviewUrl', method: 'GET', description: 'Get app builder preview URL.', params: 'projectId' },
    { name: 'getImageUploadUrl', method: 'GET', description: 'Get image upload URL.', params: 'projectId' },
    { name: 'generateCloneToken', method: 'POST', description: 'Generate clone token.', params: 'projectId' },
    { name: 'triggerBuild', method: 'POST', description: 'Trigger app builder build.', params: 'projectId' },
    { name: 'prepareLegacySession', method: 'POST', description: 'Prepare legacy session.', params: 'projectId' }
  ],
  appReportedMessages: [
    { name: 'createReport', method: 'POST', description: 'Create app reported message.', params: 'messageId, reason, details' }
  ],
  deployments: [
    { name: 'listDeployments', method: 'GET', description: 'List all deployments.' },
    { name: 'getDeployment', method: 'GET', description: 'Get deployment details.', params: 'id (string, required)' },
    { name: 'createDeployment', method: 'POST', description: 'Create deployment.', params: 'platformIntegrationId, repositoryFullName, branch' },
    { name: 'setEnvVar', method: 'POST', description: 'Set deployment environment variable.', params: 'deploymentId, key, value, isSecret' },
    { name: 'deleteDeployment', method: 'POST', description: 'Delete deployment.', params: 'id (string, required)' },
    { name: 'checkDeploymentEligibility', method: 'GET', description: 'Check deployment eligibility.' },
    { name: 'deleteEnvVar', method: 'POST', description: 'Delete deployment env var.', params: 'deploymentId, key' },
    { name: 'renameEnvVar', method: 'POST', description: 'Rename deployment env var.', params: 'deploymentId, oldKey, newKey' },
    { name: 'listEnvVars', method: 'GET', description: 'List deployment env vars.', params: 'deploymentId' },
    { name: 'redeploy', method: 'POST', description: 'Redeploy.', params: 'deploymentId' },
    { name: 'cancelBuild', method: 'POST', description: 'Cancel build.', params: 'deploymentId' },
    { name: 'getBuildEvents', method: 'GET', description: 'Get build events.', params: 'deploymentId' }
  ],
  githubApps: [
    { name: 'listIntegrations', method: 'GET', description: 'List GitHub app integrations.' },
    { name: 'getInstallation', method: 'GET', description: 'Get GitHub app installation.' },
    { name: 'connectRepo', method: 'POST', description: 'Connect GitHub repository.', params: 'integrationId, repositoryFullName' },
    { name: 'disconnectRepo', method: 'POST', description: 'Disconnect GitHub repository.', params: 'integrationId, repositoryFullName' },
    { name: 'checkUserPendingInstallation', method: 'GET', description: 'Check user pending GitHub installation.' },
    { name: 'cancelPendingInstallation', method: 'POST', description: 'Cancel pending installation.' },
    { name: 'listRepositories', method: 'GET', description: 'List GitHub repositories.' },
    { name: 'listBranches', method: 'GET', description: 'List GitHub branches.', params: 'repositoryFullName' },
    { name: 'refreshInstallation', method: 'POST', description: 'Refresh installation.' },
    { name: 'uninstallApp', method: 'POST', description: 'Uninstall GitHub app.', params: 'installationId' },
    { name: 'devAddInstallation', method: 'POST', description: 'Dev add installation.', params: 'installationId' }
  ],
  gitlab: [
    { name: 'getInstallation', method: 'GET', description: 'Get GitLab installation.' },
    { name: 'getAuthUrl', method: 'GET', description: 'Get GitLab auth URL.', params: 'state (string, required)' },
    { name: 'disconnect', method: 'POST', description: 'Disconnect GitLab.' },
    { name: 'disconnectOrg', method: 'POST', description: 'Disconnect GitLab organization.', params: 'organizationId' },
    { name: 'getIntegration', method: 'GET', description: 'Get GitLab integration.' },
    { name: 'listRepositories', method: 'GET', description: 'List GitLab repositories.' },
    { name: 'listBranches', method: 'GET', description: 'List GitLab branches.', params: 'projectId' },
    { name: 'refreshRepositories', method: 'POST', description: 'Refresh GitLab repositories.' }
  ],
  slack: [
    { name: 'getInstallation', method: 'GET', description: 'Get Slack installation.' },
    { name: 'getOAuthUrl', method: 'GET', description: 'Get Slack OAuth URL.' },
    { name: 'disconnect', method: 'POST', description: 'Disconnect Slack.' },
    { name: 'testConnection', method: 'POST', description: 'Test Slack connection.' },
    { name: 'sendTestMessage', method: 'POST', description: 'Send test Slack message.' },
    { name: 'updateModel', method: 'POST', description: 'Update Slack model.', params: 'model' },
    { name: 'uninstallApp', method: 'POST', description: 'Uninstall Slack app.' },
    { name: 'devRemoveDbRowOnly', method: 'POST', description: 'Dev remove DB row only.' }
  ],
  securityAgent: [
    { name: 'listFindings', method: 'GET', description: 'List security findings.' },
    { name: 'getFinding', method: 'GET', description: 'Get security finding details.', params: 'id (string, required)' },
    { name: 'dismissFinding', method: 'POST', description: 'Dismiss security finding.', params: 'findingId, reason' },
    { name: 'getConfig', method: 'GET', description: 'Get security agent config.' },
    { name: 'getRepositories', method: 'GET', description: 'Get security agent repositories.' },
    { name: 'getStats', method: 'GET', description: 'Get security agent stats.' },
    { name: 'getPermissionStatus', method: 'GET', description: 'Get security agent permission status.' },
    { name: 'getOrphanedRepositories', method: 'GET', description: 'Get orphaned repositories.' },
    { name: 'getAutoDismissEligible', method: 'GET', description: 'Get auto-dismiss eligible findings.' },
    { name: 'autoDismissEligible', method: 'GET', description: 'Get auto dismiss eligible findings.' },
    { name: 'saveConfig', method: 'POST', description: 'Save security agent config.', params: 'config' },
    { name: 'setEnabled', method: 'POST', description: 'Set security agent enabled.', params: 'enabled' },
    { name: 'startAnalysis', method: 'POST', description: 'Start security analysis.', params: 'repositoryId' },
    { name: 'triggerSync', method: 'POST', description: 'Trigger security sync.', params: 'repositoryId' },
    { name: 'getAnalysis', method: 'GET', description: 'Get security analysis.', params: 'repositoryId' },
    { name: 'getLastSyncTime', method: 'GET', description: 'Get last sync time.', params: 'repositoryId' },
    { name: 'listAnalysisJobs', method: 'GET', description: 'List analysis jobs.' },
    { name: 'deleteFindingsByRepository', method: 'POST', description: 'Delete findings by repository.', params: 'repositoryId' }
  ],
  personalAutoFix: [
    { name: 'getAutoFixConfig', method: 'GET', description: 'Get personal auto fix config.' },
    { name: 'listGitHubRepositories', method: 'GET', description: 'List personal auto fix GitHub repositories.' },
    { name: 'listTickets', method: 'GET', description: 'List personal auto fix tickets.' },
    { name: 'saveAutoFixConfig', method: 'POST', description: 'Save personal auto fix config.', params: 'config' },
    { name: 'toggleAutoFixAgent', method: 'POST', description: 'Toggle personal auto fix agent.', params: 'enabled' },
    { name: 'cancelFix', method: 'POST', description: 'Cancel personal auto fix.', params: 'ticketId' },
    { name: 'retriggerFix', method: 'POST', description: 'Retrigger personal auto fix.', params: 'ticketId' }
  ],
  personalAutoTriage: [
    { name: 'getAutoTriageConfig', method: 'GET', description: 'Get personal auto triage config.' },
    { name: 'getGitHubStatus', method: 'GET', description: 'Get personal auto triage GitHub status.' },
    { name: 'listGitHubRepositories', method: 'GET', description: 'List personal auto triage GitHub repositories.' },
    { name: 'listTickets', method: 'GET', description: 'List personal auto triage tickets.' },
    { name: 'saveAutoTriageConfig', method: 'POST', description: 'Save personal auto triage config.', params: 'config' },
    { name: 'toggleAutoTriageAgent', method: 'POST', description: 'Toggle personal auto triage agent.', params: 'enabled' },
    { name: 'retryTicket', method: 'POST', description: 'Retry personal auto triage ticket.', params: 'ticketId' }
  ],
  userFeedback: [
    { name: 'create', method: 'POST', description: 'Create user feedback.', params: 'message, type' }
  ],
  test: [
    { name: 'hello', method: 'GET', description: 'Test endpoint.' }
  ]
}

// Auto-generate procedures from definitions
const procedures: Record<string, any> = {}
for (const [namespace, endpoints] of Object.entries(endpointDefinitions)) {
  for (const endpoint of endpoints) {
    const key = `${namespace}.${endpoint.name}`
    procedures[key] = createProcedure(namespace, endpoint.name, endpoint.method, endpoint.description, endpoint.params)
  }
}

// Generate tool description dynamically
const descriptionIntro = `Use this tool to control Kilo Cloud Agents and Webhooks.
All procedures return JSON responses.
You can use the params argument to pass parameters to the procedure as a JSON string.`

function generateDescription() {
  let description = descriptionIntro + "\nAvailable procedures:\n"
  for (const key in procedures) {
    description += `- ${key}: ${procedures[key].description}\n`
  }
  return description
}

export default tool({
  description: generateDescription(),
  args: {
    procedure: tool.schema.string().describe("Name of the procedure to execute."),
    params: tool.schema.string().describe("Parameters to pass to the procedure.").optional(),
  },
  async execute(args) {
    try {
      if (!procedures[args.procedure]) {
        throw new Error(`Procedure ${args.procedure} not found.`)
      }
      const procedure = procedures[args.procedure]
      const parsedParams = args.params ? JSON.parse(args.params) : {}
      const result = await procedure.execute(parsedParams)
      return JSON.stringify(result)
    } catch (error) {
      return `Error executing procedure: ${error.message}.`
    }
  }
})
