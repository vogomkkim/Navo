import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { healthController } from './health.controller';

describe('HealthController', () => {
  let mockApp: any;

  beforeEach(() => {
    mockApp = {
      get: jest.fn(),
    };
  });

  it('should register GET /health route and return health payload', async () => {
    // Arrange
    healthController(mockApp);
    expect(mockApp.get).toHaveBeenCalledWith('/health', expect.any(Function));

    const routeHandler = mockApp.get.mock.calls[0][1];
    const mockReply = {
      send: jest.fn(),
    } as any;

    // Act
    await routeHandler({} as any, mockReply);

    // Assert
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, status: 'healthy' })
    );
    const payload = mockReply.send.mock.calls[0][0];
    expect(typeof payload.uptime).toBe('number');
    expect(typeof payload.timestamp).toBe('string');
  });
});

