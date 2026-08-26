import { Router } from 'express';
import type { RequestHandler } from 'express';
import { toolRegistry } from '../ai/tools/ToolRegistry';
import type { AuthenticatedRequest, SecurityContext, UserRole } from '../ai/tools/types';

const router = Router();

const executeToolHandler: RequestHandler = async (req, res) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const { toolName, parameters, confirmed } = authReq.body;

    if (!toolName) {
      res.status(400).json({ success: false, error: 'Parameter toolName is required.' });
      return;
    }

    const user = authReq.user;
    const context: SecurityContext = {
      userId: user?.id,
      role: (user?.role as UserRole) || 'GUEST',
      storeId: user?.storeId,
      permissions: user?.permissions || [],
      ipAddress: authReq.ip
    };

    const result = await toolRegistry.executeTool(toolName, parameters || {}, context, Boolean(confirmed));

    if (result.requiresApproval && !confirmed) {
      res.status(202).json({
        success: false,
        requiresApproval: true,
        message: 'Action requires explicit user confirmation.',
        result
      });
      return;
    }

    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal error executing AI tool endpoint'
    });
  }
};

const getToolsHandler: RequestHandler = (req, res) => {
  const authReq = req as unknown as AuthenticatedRequest;
  try {
    const role = (authReq.user?.role as UserRole) || 'GUEST';
    const availableTools = toolRegistry.getToolsForRole(role).map((t) => ({
      name: t.name,
      description: t.description,
      riskLevel: t.riskLevel,
      parameters: t.parameters
    }));

    res.status(200).json({ success: true, tools: availableTools });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to list tools' });
  }
};

router.post('/execute-tool', executeToolHandler);
router.get('/tools', getToolsHandler);

export default router;