import { tool } from "@kilocode/plugin"

/**
## Kilo Cloud API

This tool provides access to Kilo Cloud API endpoints via both tRPC and REST.

All endpoints require `KILO_API_KEY` environment variable to be set.

Example usage (tRPC):
- List webhooks: kilo-cloud("webhookTriggers.list", {})
- Get webhook: kilo-cloud("webhookTriggers.get", {"triggerId": "my-trigger"})
- Create webhook: kilo-cloud("webhookTriggers.create", {"triggerId": "my-trigger", "githubRepo": "owner/repo", ...})

Example usage (REST):
- Get profile: kilo-cloud("GET /api/profile", {})
- Get usage: kilo-cloud("GET /api/profile/usage", {"viewType": "personal"})
- Get org: kilo-cloud("GET /api/organizations/[id]", {"id": "org-123"})

Example usage (YAML/raw responses):
- Get marketplace skills (YAML): kilo-cloud("GET /api/marketplace/skills", {})
- Get marketplace modes (YAML): kilo-cloud("GET /api/marketplace/modes", {})

YAML endpoints automatically return raw text (not parsed JSON).

Troubleshooting:
- When tRPC parameters are wrong, check `$KILO_BASE/cloud/src/routers`, grep for `Procedure`.
- When REST parameters are wrong, check `$KILO_BASE/cloud/src/app/api` for route handlers.
- See https://github.com/Kilo-Org/cloud
 */

const baseUrl = "https://app.kilo.ai/api"
const headers = {
  "Authorization": `Bearer ${process.env.KILO_API_KEY}`,
  "Content-Type": "application/json"
}

// Type definitions for endpoint configuration
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface EndpointConfig {
  name: string
  method: HttpMethod
  description: string
  params?: string
  raw?: boolean
}

// Factory function to create tRPC procedure executors
const createTrpcProcedure = (namespace: string, name: string, method: HttpMethod, description: string, paramSchema?: string) => ({
  type: 'trpc',
  method,
  path: `/${namespace}.${name}`,
  description: `${description}${paramSchema ? ` Parameters: ${paramSchema}` : ''}`,
  execute: async (params: any, returnRaw: boolean = false) => {
    try {
      // Extract returnRaw from params if it exists
      const { returnRaw: returnRawParam, ...apiParams } = params || {}
      const shouldReturnRaw = returnRaw || returnRawParam
      
      if (method === 'GET') {
        const input = encodeURIComponent(JSON.stringify(apiParams || {}))
        const url = `${baseUrl}/trpc/${namespace}.${name}?input=${input}`
        const response = await fetch(url, { method, headers })
        const text = await response.text()
        
        // If returnRaw is true, return text as-is
        if (shouldReturnRaw) {
          return { _raw: true, content: text, status: response.status }
        }
        
        try {
          return JSON.parse(text)
        } catch (e) {
          throw new Error(`Failed to parse JSON response. Procedure: ${namespace}.${name}, URL: ${url}, Status: ${response.status}, Error: ${e.message}, Response body (first 500 chars): ${text.substring(0, 500)}`)
        }
      } else {
        const url = `${baseUrl}/trpc/${namespace}.${name}`
        const response = await fetch(url, {
          method,
          headers,
          body: JSON.stringify(apiParams || {})
        })
        const text = await response.text()
        
        // If returnRaw is true, return text as-is
        if (shouldReturnRaw) {
          return { _raw: true, content: text, status: response.status }
        }
        
        try {
          return JSON.parse(text)
        } catch (e) {
          throw new Error(`Failed to parse JSON response. Procedure: ${namespace}.${name}, URL: ${url}, Status: ${response.status}, Error: ${e.message}, Response body (first 500 chars): ${text.substring(0, 500)}`)
        }
      }
    } catch (e) {
      throw new Error(`tRPC execute error for procedure "${namespace}.${name}": ${e.message}`)
    }
  }
})

// Factory function to create REST procedure executors
const createRestProcedure = (path: string, method: HttpMethod, description: string, paramSchema?: string, raw?: boolean) => {
  // Capture raw flag in closure
  const isRawEndpoint = raw === true
  
  return {
    type: 'rest',
    method,
    path,
    description: `${description}${paramSchema ? ` Parameters: ${paramSchema}` : ''}`,
    raw: isRawEndpoint, // Store it on the object for debugging
    execute: async (params: any) => {
      try {
        const { returnRaw: returnRawParam, ...apiParams } = params || {}
        const shouldReturnRaw = isRawEndpoint || returnRawParam

        // Handle path parameters (e.g., [id])
        let finalPath = path
        if (apiParams && typeof apiParams === 'object') {
          // Replace [param] placeholders in path
          for (const [key, value] of Object.entries(apiParams)) {
            finalPath = finalPath.replace(`[${key}]`, String(value))
          }
        }
        
        if (method === 'GET') {
          // For GET requests, add remaining params as query string
          const pathParams = (path.match(/\[(\w+)\]/g) || []).map(p => p.slice(1, -1))
          const queryParams = { ...apiParams }
          for (const p of pathParams) {
            delete queryParams[p]
          }
          
          const queryString = Object.keys(queryParams).length > 0 
            ? '?' + new URLSearchParams(queryParams).toString()
            : ''
          
          const url = `${baseUrl}${finalPath}${queryString}`
          const response = await fetch(url, { method, headers })
          const text = await response.text()
          
          // If shouldReturnRaw is true, return text as-is
          if (shouldReturnRaw) {
            return { _raw: true, content: text, status: response.status }
          }
          
          try {
            return JSON.parse(text)
          } catch (e) {
            throw new Error(`Failed to parse JSON response. Endpoint: ${path}, URL: ${url}, Status: ${response.status}, Error: ${e.message}, Response body (first 500 chars): ${text.substring(0, 500)}`)
          }
        } else {
          // For POST/PUT/DELETE, send body
          const pathParams = (path.match(/\[(\w+)\]/g) || []).map(p => p.slice(1, -1))
          const bodyParams = { ...apiParams }
          for (const p of pathParams) {
            delete bodyParams[p]
          }
          
          const url = `${baseUrl}${finalPath}`
          const response = await fetch(url, {
            method,
            headers,
            body: JSON.stringify(bodyParams)
          })
          const text = await response.text()
          
          // If shouldReturnRaw is true, return text as-is
          if (shouldReturnRaw) {
            return { _raw: true, content: text, status: response.status }
          }
          
          try {
            return JSON.parse(text)
          } catch (e) {
            throw new Error(`Failed to parse JSON response. Endpoint: ${path}, URL: ${url}, Status: ${response.status}, Error: ${e.message}, Response body (first 500 chars): ${text.substring(0, 500)}`)
          }
        }
      } catch (e) {
        throw new Error(`REST execute error for endpoint "${path}": ${e.message}`)
      }
    }
  }
}

const restEndpoints: Record<string, EndpointConfig[]> = {
  'profile': [
    { name: 'GET /api/profile', method: 'GET', description: 'Get user profile + organizations.' },
    { name: 'GET /api/profile/usage', method: 'GET', description: 'Get user usage data.', params: 'groupByModel (boolean), viewType (personal|all|orgId)' },
    { name: 'GET /api/profile/balance', method: 'GET', description: 'Get user credit balance.' },
    { name: 'POST /api/profile/redeem-promocode', method: 'POST', description: 'Redeem promo code.', params: 'code' },
  ],
  'marketplace': [
    { name: 'GET /api/marketplace/skills', method: 'GET', description: 'List marketplace skills (returns YAML).', raw: true },
    { name: 'GET /api/marketplace/modes', method: 'GET', description: 'List marketplace modes (returns YAML).', raw: true },
    { name: 'GET /api/marketplace/mcps', method: 'GET', description: 'List marketplace MCPs (returns YAML).', raw: true },
  ],
  'openrouter': [
    { name: 'GET /api/openrouter/models', method: 'GET', description: 'List OpenRouter models.' },
    { name: 'GET /api/openrouter/providers', method: 'GET', description: 'List providers.' },
    { name: 'GET /api/openrouter/models-by-provider', method: 'GET', description: 'Models by provider.', params: 'provider' },
  ],
  'defaults': [
    { name: 'GET /api/defaults', method: 'GET', description: 'Get defaults.' },
  ],
  'models': [
    { name: 'GET /api/models/up', method: 'GET', description: 'Model health check.', params: 'key (string, required for auth)' },
    { name: 'GET /api/models/stats', method: 'GET', description: 'Model stats overview.' },
    { name: 'GET /api/models/stats/[slug]', method: 'GET', description: 'Per-model stats.', params: 'slug (string, required)' },
    { name: 'GET /api/modelstats', method: 'GET', description: 'Model stats (alt).' },
  ],
  'fim': [
    { name: 'POST /api/fim/completions', method: 'POST', description: 'FIM (fill-in-middle) completions.', params: 'model (string, required, e.g. mistralai/codestral-latest), prompt (string, required), suffix (string, optional), max_tokens (number, optional, max 1000), min_tokens (number, optional), stop (array of strings, optional), stream (boolean, optional)' },
  ],
}

const trpcEndpoints: Record<string, EndpointConfig[]> = {
  'user': [
    { name: 'getAuthProviders', method: 'GET', description: 'Get user auth providers.' },
    { name: 'getCreditBlocks', method: 'GET', description: 'Get user credit blocks.' },
    { name: 'getAutocompleteMetrics', method: 'GET', description: 'Get autocomplete metrics.', params: 'viewType? (personal|all)' },
    { name: 'getAutoTopUpPaymentMethod', method: 'GET', description: 'Get auto top-up payment method.' },
  ],
  'webhookTriggers': [
    { name: 'list', method: 'GET', description: 'List all webhook triggers.', params: 'organizationId?' },
    { name: 'get', method: 'GET', description: 'Get webhook trigger details.', params: 'triggerId, organizationId?' },
    { name: 'create', method: 'POST', description: 'Create webhook trigger.', params: 'triggerId, organizationId?, githubRepo, mode (architect|code|ask|debug|orchestrator), model (e.g. minimax/minimax-m2.1:free), promptTemplate, profileId (fetch from agentProfiles.list first), autoCommit?, condenseOnComplete?, webhookAuth? ({"x-header":"secret"})' },
    { name: 'update', method: 'POST', description: 'Update webhook trigger.', params: 'triggerId, organizationId?, mode (architect|code|ask|debug|orchestrator), model (e.g. minimax/minimax-m2.1:free), promptTemplate, profileId (fetch from agentProfiles.list first), autoCommit?, condenseOnComplete?, isActive?, webhookAuth? ({"x-header":"secret"})' },
    { name: 'delete', method: 'POST', description: 'Delete webhook trigger.', params: 'triggerId, organizationId?' },
    { name: 'listRequests', method: 'GET', description: 'List webhook requests.', params: 'triggerId, organizationId?, limit? (1-100)' },
  ],
  'organizations': [
    { name: 'list', method: 'GET', description: 'List all organizations.' },
  ],
  'cloudAgent': [
    { name: 'getSession', method: 'GET', description: 'Get session details.', params: 'cloudAgentSessionId' },
    { name: 'checkEligibility', method: 'GET', description: 'Check CloudAgent eligibility.' },
    { name: 'listGitHubRepositories', method: 'GET', description: 'List GitHub repositories.', params: 'forceRefresh?' },
    { name: 'listGitLabRepositories', method: 'GET', description: 'List GitLab repositories.', params: 'forceRefresh?' },
    { name: 'checkDemoRepositoryFork', method: 'GET', description: 'Check demo repository fork status.' },
    { name: 'prepareSession', method: 'POST', description: 'Prepare session. Returns kiloSessionId (UUID) and cloudAgentSessionId (agent_...).', params: 'prompt, mode (architect|code|ask|debug|orchestrator), model, githubRepo OR gitlabProject (mutually exclusive), profileName?, envVars?, setupCommands?, mcpServers?, upstreamBranch?, autoCommit?' },
    { name: 'prepareLegacySession', method: 'POST', description: 'Prepare legacy session.', params: 'cloudAgentSessionId?, kiloSessionId, prompt, mode, model, githubRepo OR gitlabProject, profileName?, envVars?, setupCommands?, autoCommit?' },
    { name: 'initiateFromKilocodeSessionV2', method: 'POST', description: 'Initiate from prepared session. Returns executionId + streamUrl.', params: 'cloudAgentSessionId (for prepared) OR kiloSessionId + githubRepo + prompt + mode + model (for legacy)' },
    { name: 'initiateSessionStream', method: 'POST', description: 'Initiate session with SSE streaming.', params: 'prompt, mode, model, githubRepo OR gitlabProject, profileName?, envVars?, setupCommands?, autoCommit?' },
    { name: 'initiateFromKilocodeSessionStream', method: 'POST', description: 'Initiate from Kilocode session with SSE streaming.', params: 'cloudAgentSessionId? OR kiloSessionId + githubRepo + prompt + mode + model' },
    { name: 'sendMessageV2', method: 'POST', description: 'Send message to initiated session. Returns executionId + streamUrl for WebSocket.', params: 'cloudAgentSessionId, prompt, mode (architect|code|ask|debug|orchestrator), model, autoCommit?' },
    { name: 'sendMessageStream', method: 'POST', description: 'Send message with SSE stream directly.', params: 'cloudAgentSessionId, prompt, mode, model, autoCommit?' },
    { name: 'interruptSession', method: 'POST', description: 'Interrupt running session.', params: 'sessionId' },
    { name: 'deleteSession', method: 'POST', description: 'Delete session.', params: 'sessionId' },
  ],
  'cloudAgentNext': [
    { name: 'getSession', method: 'GET', description: 'Get session details.', params: 'cloudAgentSessionId' },
    { name: 'listGitHubRepositories', method: 'GET', description: 'List GitHub repositories.', params: 'forceRefresh?' },
    { name: 'listGitLabRepositories', method: 'GET', description: 'List GitLab repositories.', params: 'forceRefresh?' },
    { name: 'prepareSession', method: 'POST', description: 'Prepare session. Returns kiloSessionId (ses_...) and cloudAgentSessionId (agent_...).', params: 'prompt, mode (plan|code|build|orchestrator|architect|ask|custom), model, githubRepo OR gitlabProject (mutually exclusive), profileName?, envVars?, setupCommands?, mcpServers?, upstreamBranch?, autoCommit?' },
    { name: 'initiateFromPreparedSession', method: 'POST', description: 'Initiate prepared session. Returns executionId and streamUrl.', params: 'cloudAgentSessionId' },
    { name: 'interruptSession', method: 'POST', description: 'Interrupt session.', params: 'sessionId' },
    { name: 'sendMessage', method: 'POST', description: 'Send message to initiated session. Only supports plan|build modes. Returns executionId and streamUrl.', params: 'cloudAgentSessionId, prompt, mode (plan|build), model, autoCommit?' }
  ],
  'cliSessions': [
    { name: 'list', method: 'GET', description: 'List CLI sessions from CloudAgent.' },
    { name: 'get', method: 'GET', description: 'Get CLI session details.', params: 'session_id' },
    { name: 'search', method: 'GET', description: 'Search CLI sessions.', params: 'search_string, limit?, offset?, createdOnPlatform?, organizationId?' },
    { name: 'getSessionMessages', method: 'GET', description: 'Get CLI session messages.', params: 'session_id' },
    { name: 'getSessionApiConversationHistory', method: 'GET', description: 'Get CLI session API conversation history.', params: 'session_id' },
    { name: 'getSessionGitState', method: 'GET', description: 'Get CLI session git state.', params: 'session_id' },
    { name: 'getByCloudAgentSessionId', method: 'GET', description: 'Get CLI session by cloud agent session ID (agent_...).', params: 'cloud_agent_session_id' },
    { name: 'createV2', method: 'POST', description: 'Create CLI session.', params: 'created_on_platform (cloud-agent|cli|agent-manager), title?, git_url?, version?, last_mode?, last_model?, organization_id?, parent_session_id?, cloud_agent_session_id?' },
    { name: 'update', method: 'POST', description: 'Update CLI session.', params: 'session_id, title?, git_url?, version?, last_mode?, last_model?, organization_id?' },
    { name: 'delete', method: 'POST', description: 'Delete CLI session.', params: 'session_id' },
    { name: 'fork', method: 'POST', description: 'Fork CLI session.', params: 'share_or_session_id, created_on_platform (cloud-agent|cli|agent-manager)' },
    { name: 'forkForReview', method: 'POST', description: 'Fork CLI session for review.', params: 'review_id, created_on_platform (cloud-agent|cli|agent-manager)' },
    { name: 'share', method: 'POST', description: 'Share CLI session.', params: 'session_id, shared_state (public|organization)' },
    { name: 'shareForWebhookTrigger', method: 'POST', description: 'Share CLI session for webhook trigger.', params: 'kilo_session_id, trigger_id, organization_id?' },
    { name: 'linkCloudAgent', method: 'POST', description: 'Link cloud agent to CLI session.', params: 'kilo_session_id, cloud_agent_session_id' }
  ],
  'cliSessionsV2': [
    { name: 'list', method: 'GET', description: 'List CLI sessions V2 (CloudAgentNext).' },
    { name: 'get', method: 'GET', description: 'Get CLI session details V2.', params: 'session_id' },
    { name: 'getSessionMessages', method: 'GET', description: 'Get CLI session V2 messages (currently returns empty list).', params: 'session_id' },
    { name: 'getByCloudAgentSessionId', method: 'GET', description: 'Get CLI session V2 by cloud agent session ID (agent_...).', params: 'cloud_agent_session_id' },
    { name: 'getWithRuntimeState', method: 'GET', description: 'Get CLI session V2 with runtime state from DO.', params: 'session_id' }
  ],
  'agentProfiles': [
    { name: 'list', method: 'GET', description: 'List all agent profiles.' },
    { name: 'get', method: 'GET', description: 'Get agent profile details.', params: 'id' },
    { name: 'create', method: 'POST', description: 'Create agent profile.', params: 'name, envVars' },
    { name: 'update', method: 'POST', description: 'Update agent profile.', params: 'id, name?, envVars?' },
    { name: 'delete', method: 'POST', description: 'Delete agent profile.', params: 'id' },
    { name: 'setVar', method: 'POST', description: 'Set agent profile variable.', params: 'id, key, value' },
    { name: 'deleteVar', method: 'POST', description: 'Delete agent profile variable.', params: 'id, key' },
    { name: 'setAsDefault', method: 'POST', description: 'Set agent profile as default.', params: 'id' },
    { name: 'clearDefault', method: 'POST', description: 'Clear agent profile default.' },
    { name: 'setCommands', method: 'POST', description: 'Set agent profile commands.', params: 'id, commands' },
    { name: 'listCombined', method: 'GET', description: 'List combined agent profiles.', params: 'organizationId' }
  ],
  'codeIndexing': [
    { name: 'search', method: 'GET', description: 'Search code index.', params: 'query, organizationId?, repositoryId?' },
    { name: 'getManifest', method: 'GET', description: 'Get code index manifest.', params: 'repositoryId' },
    { name: 'isEnabled', method: 'GET', description: 'Check if code indexing is enabled.', params: 'repositoryId' },
    { name: 'upsertByFile', method: 'POST', description: 'Upsert code index by file.', params: 'repositoryId, filePath, content' },
    { name: 'delete', method: 'POST', description: 'Delete code index.', params: 'repositoryId' }
  ],
  'kiloPass': [
    { name: 'getState', method: 'GET', description: 'Get Kilo Pass state.' },
    { name: 'getCheckoutReturnState', method: 'GET', description: 'Get checkout return state.', params: 'sessionId' },
    { name: 'getAverageMonthlyUsageLast3Months', method: 'GET', description: 'Get average monthly usage last 3 months.' },
    { name: 'getFirstMonthPromoEligibility', method: 'GET', description: 'Get first month promo eligibility.' },
    //{ name: 'createCheckoutSession', method: 'POST', description: 'Create checkout session.', params: 'priceId' },
    //{ name: 'getCustomerPortalUrl', method: 'POST', description: 'Get customer portal URL.', params: 'returnUrl?' },
    //{ name: 'cancelSubscription', method: 'POST', description: 'Cancel subscription.' },
    //{ name: 'resumeSubscription', method: 'POST', description: 'Resume subscription.' },
    //{ name: 'scheduleChange', method: 'POST', description: 'Schedule subscription change.', params: 'priceId' },
    //{ name: 'cancelScheduledChange', method: 'POST', description: 'Cancel scheduled change.' },
    //{ name: 'getScheduledChange', method: 'GET', description: 'Get scheduled change.' },
  ],
  'byok': [
    { name: 'list', method: 'GET', description: 'List all BYOK (Bring Your Own Key) entries.' },
    { name: 'create', method: 'POST', description: 'Create BYOK entry.', params: 'provider_id, api_key' },
    { name: 'update', method: 'POST', description: 'Update BYOK entry.', params: 'id, api_key' },
    { name: 'delete', method: 'POST', description: 'Delete BYOK entry.', params: 'id' }
  ],
  'appBuilder': [
    { name: 'checkEligibility', method: 'GET', description: 'Check app builder eligibility.' },
    { name: 'listProjects', method: 'GET', description: 'List app builder projects.' },
    { name: 'getProject', method: 'GET', description: 'Get app builder project details.', params: 'projectId' },
    { name: 'createProject', method: 'POST', description: 'Create app builder project. (Next step: startSession)', params: 'prompt, model, images?, title?, template?, mode? (code|ask)' },
    { name: 'startSession', method: 'POST', description: 'Start/initiate app builder session. (Poll with: cloudAgent.getSession field execution.status=null, Next step: deployProject)', params: 'projectId' },
    { name: 'deployProject', method: 'POST', description: 'Deploy app builder project. (Poll with: deployments.getDeployment field latestBuild.status!=building. Next step: getBuildEvents)', params: 'projectId' },
    { name: 'interruptSession', method: 'POST', description: 'Interrupt app builder session.', params: 'projectId' },
    { name: 'sendMessage', method: 'POST', description: 'Send message to app builder.', params: 'projectId, message' },
    { name: 'getPreviewUrl', method: 'GET', description: 'Get app builder preview URL.', params: 'projectId' },
    { name: 'getImageUploadUrl', method: 'POST', description: 'Get image upload URL.', params: 'messageUuid, imageId, contentType (image/png|image/jpeg|image/webp|image/gif), contentLength' },
    { name: 'generateCloneToken', method: 'POST', description: 'Generate clone token.', params: 'projectId' },
    { name: 'triggerBuild', method: 'POST', description: 'Trigger app builder build.', params: 'projectId' },
    { name: 'deleteProject', method: 'POST', description: 'Delete app builder project.', params: 'projectId' },    
  ],
  'deployments': [
    { name: 'listDeployments', method: 'GET', description: 'List all deployments.' },
    { name: 'getDeployment', method: 'GET', description: 'Get deployment details.', params: 'id' },
    { name: 'createDeployment', method: 'POST', description: 'Create deployment.', params: 'platformIntegrationId, repositoryFullName, branch, envVars?' },
    { name: 'setEnvVar', method: 'POST', description: 'Set deployment environment variable.', params: 'deploymentId, key, value, isSecret' },
    { name: 'deleteDeployment', method: 'POST', description: 'Delete deployment.', params: 'id' },
    { name: 'checkDeploymentEligibility', method: 'GET', description: 'Check deployment eligibility.' },
    { name: 'deleteEnvVar', method: 'POST', description: 'Delete deployment env var.', params: 'deploymentId, key' },
    { name: 'renameEnvVar', method: 'POST', description: 'Rename deployment env var.', params: 'deploymentId, oldKey, newKey' },
    { name: 'listEnvVars', method: 'GET', description: 'List deployment env vars.', params: 'deploymentId' },
    { name: 'redeploy', method: 'POST', description: 'Redeploy.', params: 'id' },
    { name: 'cancelBuild', method: 'POST', description: 'Cancel build.', params: 'deploymentId, buildId' },
    { name: 'getBuildEvents', method: 'GET', description: 'Get build events.', params: 'deploymentId, buildId, limit?, afterEventId?' }
  ],
  'autoTriage': [
    { name: 'listTicketsForUser', method: 'GET', description: 'List auto triage tickets for user.', params: 'limit?, offset?, status? (pending|analyzing|actioned|failed|skipped), classification? (bug|feature|question|duplicate|unclear), repoFullName?' },
    { name: 'getTicket', method: 'GET', description: 'Get auto triage ticket details.', params: 'ticketId' },
    { name: 'retrigger', method: 'POST', description: 'Retrigger a failed triage ticket.', params: 'ticketId' }
  ],
  'autoFix': [
    { name: 'listTicketsForUser', method: 'GET', description: 'List auto fix tickets for user.', params: 'limit?, offset?, status?, classification?, repoFullName?' },
    { name: 'getTicket', method: 'GET', description: 'Get auto fix ticket details.', params: 'ticketId' },
    { name: 'retrigger', method: 'POST', description: 'Retrigger a failed fix ticket.', params: 'ticketId' },
    { name: 'cancel', method: 'POST', description: 'Cancel a fix ticket.', params: 'ticketId' }
  ],
  'codeReviews': [
    { name: 'listForUser', method: 'GET', description: 'List code reviews for user.', params: 'limit?, offset?, status?, repoFullName?' },
    { name: 'get', method: 'GET', description: 'Get code review details.', params: 'reviewId' },
    { name: 'cancel', method: 'POST', description: 'Cancel code review.', params: 'reviewId' },
    { name: 'retrigger', method: 'POST', description: 'Retrigger code review.', params: 'reviewId' }
  ],
  'personalReviewAgent': [
    { name: 'getGitHubStatus', method: 'GET', description: 'Get GitHub App installation status for personal reviews.' },
    { name: 'listGitHubRepositories', method: 'GET', description: 'List GitHub repositories for personal reviews.', params: 'forceRefresh?' },
    { name: 'getReviewConfig', method: 'GET', description: 'Get personal review agent config.' },
    { name: 'saveReviewConfig', method: 'POST', description: 'Save personal review agent config.', params: 'reviewStyle (strict|balanced|lenient), focusAreas, customInstructions?, maxReviewTimeMinutes (5-30), modelSlug, repositorySelectionMode? (all|selected), selectedRepositoryIds?' },
    { name: 'toggleReviewAgent', method: 'POST', description: 'Toggle personal review agent.', params: 'isEnabled' }
  ],
  'githubApps': [
    { name: 'listIntegrations', method: 'GET', description: 'List GitHub app integrations.' },
    { name: 'getInstallation', method: 'GET', description: 'Get GitHub app installation.' },
    { name: 'checkUserPendingInstallation', method: 'GET', description: 'Check user pending GitHub installation.' },
    { name: 'cancelPendingInstallation', method: 'POST', description: 'Cancel pending installation.' },
    { name: 'listRepositories', method: 'GET', description: 'List GitHub repositories.', params: 'integrationId, forceRefresh?' },
    { name: 'listBranches', method: 'GET', description: 'List GitHub branches.', params: 'integrationId, repositoryFullName' },
    { name: 'refreshInstallation', method: 'POST', description: 'Refresh installation.' },
    { name: 'uninstallApp', method: 'POST', description: 'Uninstall GitHub app.' },
    
  ],
  'gitlab': [
    { name: 'getInstallation', method: 'GET', description: 'Get GitLab installation.' },
    { name: 'disconnect', method: 'POST', description: 'Disconnect GitLab.' },
    { name: 'disconnectOrg', method: 'POST', description: 'Disconnect GitLab organization.', params: 'organizationId' },
    { name: 'getIntegration', method: 'GET', description: 'Get GitLab integration.', params: 'organizationId?' },
    { name: 'listRepositories', method: 'GET', description: 'List GitLab repositories.', params: 'organizationId?, integrationId, forceRefresh?' },
    { name: 'listBranches', method: 'GET', description: 'List GitLab branches.', params: 'organizationId?, integrationId, projectPath' },
    { name: 'refreshRepositories', method: 'POST', description: 'Refresh GitLab repositories.', params: 'organizationId?, integrationId' }
  ],
  'slack': [
    { name: 'getInstallation', method: 'GET', description: 'Get Slack installation.' },
    { name: 'getOAuthUrl', method: 'GET', description: 'Get Slack OAuth URL.' },
    { name: 'uninstallApp', method: 'POST', description: 'Uninstall Slack app.' },
    { name: 'testConnection', method: 'POST', description: 'Test Slack connection.' },
    { name: 'sendTestMessage', method: 'POST', description: 'Send test Slack message.' },
    { name: 'updateModel', method: 'POST', description: 'Update Slack model.', params: 'modelSlug' },
    
  ]
}

const procedures: Record<string, any> = {}

for (const [namespace, endpoints] of Object.entries(trpcEndpoints)) {
  for (const endpoint of endpoints) {
    const key = `${namespace}.${endpoint.name}`
    procedures[key] = createTrpcProcedure(namespace, endpoint.name, endpoint.method, endpoint.description, endpoint.params)
  }
}

for (const [category, endpoints] of Object.entries(restEndpoints)) {
  for (const endpoint of endpoints) {
    // Use the endpoint name directly as the key (e.g., "GET /api/profile")
    // Remove method prefix and /api prefix since baseUrl already includes /api
    const pathWithoutMethod = endpoint.name.replace(/^(GET|POST|PUT|DELETE) /, '')
    const pathWithoutApiPrefix = pathWithoutMethod.replace(/^\/api/, '')
    procedures[endpoint.name] = createRestProcedure(
      pathWithoutApiPrefix,
      endpoint.method,
      endpoint.description,
      endpoint.params,
      endpoint.raw
    )
  }
}

const descriptionIntro = `Use this tool to control Kilo Cloud Agents and Webhooks.
All procedures return JSON responses.
You can use the params argument to pass parameters to the procedure as a JSON string.
Do NOT use optional parameters unless you have a specific reason/value to provide.

## CloudAgent
- Cloud backend via app.kilo.ai
- cloudAgentSessionId "agent_UUID" = cloud_agent_session_id in cliSessions
- kiloSessionId "UUID" = session_id in cliSessions

## CloudAgentNext
- CLI ingest via ingest.kilosessions.ai
- sessionId "agent_UUID" = cloud_agent_session_id in cliSessionsV2
- kiloSessionId "ses_..." = session_id in cliSessionsV2

**Note:** cliSessions and cliSessionsV2 use snake_case for params, while other procedures use camelCase.

`

function generateDescription() {
  let description = descriptionIntro
  const trpcByNamespace: Record<string, string[]> = {}
  const restProcedures: string[] = []
  
  for (const key in procedures) {
    const proc = procedures[key]
    if (proc.type === 'trpc') {
      const namespace = key.split('.')[0]
      if (!trpcByNamespace[namespace]) {
        trpcByNamespace[namespace] = []
      }
      trpcByNamespace[namespace].push(`- ${key}: ${proc.description}`)
    } else if (proc.type === 'rest') {
      restProcedures.push(`- ${key}: ${proc.description}`)
    }
  }
  
  description += "## Available tRPC procedures (use these first):\n"
  for (const [namespace, lines] of Object.entries(trpcByNamespace)) {
    description += lines.join('\n') + '\n'
  }
  
  if (restProcedures.length > 0) {
    description += "\n## Available REST endpoints (include /api/profile/* in profile info queries):\n"
    description += restProcedures.join('\n')
  }

  return description
}

export default tool({
  description: generateDescription(),
  args: {
    procedure: tool.schema.string().describe("Name of the procedure to execute."),
    params: tool.schema.string().describe("Parameters to pass to the procedure as JSON string.").optional(),
  },
  async execute(args) {
    try {
      if (!procedures[args.procedure]) {
        throw new Error(`Procedure ${args.procedure} not found.`)
      }
      const procedure = procedures[args.procedure]
      const parsedParams = args.params ? JSON.parse(args.params) : {}
      const result = await procedure.execute(parsedParams)
      
      // If the result indicates it's raw content, return it as a string
      if (result && result._raw) {
        return `Status: ${result.status}\n\n${result.content}`
      }
      
      return JSON.stringify(result, null, 2)
    } catch (error) {
      return JSON.stringify({
        error: true,
        message: error.message,
        stack: error.stack
      }, null, 2)
    }
  }
})
