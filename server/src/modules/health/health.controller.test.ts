

import { vi } from 'vitest';
import { healthController } from './health.controller';

describe('HealthController', () => {
  let mockApp: any;
  let mockReply: any;

  beforeEach(() => {
    mockApp = {
      get: vi.fn(),
    };
    mockReply = {
      send: vi.fn(),
    };
  });

  it('should register GET /health route and return health payload', () => {
    healthController(mockApp);

    // Check if the route was registered
    expect(mockApp.get).toHaveBeenCalledWith(
      '/health',
      expect.any(Function)
    );

    // Manually invoke the handler to test its behavior
    const handler = mockApp.get.mock.calls[0][1];
    handler(null, mockReply);

    // Check if the reply was correct
    expect(mockReply.send).toHaveBeenCalledWith({
      ok: true,
      status: 'healthy',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
    });
  });
});
