import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectViolation,
  listViolations,
  getViolation,
  actionViolation,
  getAnalytics,
  getEvidenceUrl,
} from '../api';

const fetchSpy = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchSpy);
  fetchSpy.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockOkJson<T>(data: T): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as unknown as Response;
}

function mockError(status: number, body: string): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('API client', () => {
  describe('detectViolation', () => {
    it('sends POST with FormData containing image and camera_id', async () => {
      const file = new File(['binary-data'], 'test.jpg', { type: 'image/jpeg' });
      fetchSpy.mockResolvedValueOnce(mockOkJson({ success: true, violations: [] }));

      await detectViolation(file, 'cam-01');

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url, opts] = fetchSpy.mock.calls[0];
      expect(url).toContain('/detect');
      expect(opts.method).toBe('POST');
      expect(opts.body).toBeInstanceOf(FormData);
      const form = opts.body as FormData;
      expect(form.get('image')).toBe(file);
      expect(form.get('camera_id')).toBe('cam-01');
    });

    it('omits camera_id from FormData when not provided', async () => {
      const file = new File(['data'], 'pic.png', { type: 'image/png' });
      fetchSpy.mockResolvedValueOnce(mockOkJson({ success: true }));

      await detectViolation(file);

      const form = fetchSpy.mock.calls[0][1].body as FormData;
      expect(form.get('image')).toBe(file);
      expect(form.get('camera_id')).toBeNull();
    });
  });

  describe('listViolations', () => {
    it('calls /violations with no params when none given', async () => {
      fetchSpy.mockResolvedValueOnce(mockOkJson({ total: 0, violations: [] }));

      await listViolations();

      expect(fetchSpy).toHaveBeenCalledOnce();
      expect(fetchSpy.mock.calls[0][0]).toContain('/violations');
      expect(fetchSpy.mock.calls[0][0]).not.toContain('?');
    });

    it('builds correct query string with all params', async () => {
      fetchSpy.mockResolvedValueOnce(mockOkJson({ total: 0, violations: [] }));

      await listViolations({
        violation_type: 'no_helmet',
        status: 'pending',
        camera_id: 'cam-02',
        page: 2,
        page_size: 10,
      });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('violation_type=no_helmet');
      expect(url).toContain('status=pending');
      expect(url).toContain('camera_id=cam-02');
      expect(url).toContain('page=2');
      expect(url).toContain('page_size=10');
    });

    it('skips undefined params in query string', async () => {
      fetchSpy.mockResolvedValueOnce(mockOkJson({ total: 0, violations: [] }));

      await listViolations({ status: 'approved' });

      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain('status=approved');
      expect(url).not.toContain('violation_type');
      expect(url).not.toContain('camera_id');
    });
  });

  describe('getViolation', () => {
    it('fetches /violations/{id}', async () => {
      fetchSpy.mockResolvedValueOnce(mockOkJson({ id: 'v-42' }));

      await getViolation('v-42');

      expect(fetchSpy.mock.calls[0][0]).toContain('/violations/v-42');
    });
  });

  describe('actionViolation', () => {
    it('sends POST with action and reason in body', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockOkJson({ id: 'v-01', status: 'approved', message: 'ok' }),
      );

      await actionViolation('v-01', 'approve', 'Looks valid');

      const [url, opts] = fetchSpy.mock.calls[0];
      expect(url).toContain('/violations/v-01/action');
      expect(opts.method).toBe('POST');
      expect(opts.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(JSON.parse(opts.body)).toEqual({ action: 'approve', reason: 'Looks valid' });
    });

    it('sends POST with action and no reason', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockOkJson({ id: 'v-02', status: 'rejected', message: 'done' }),
      );

      await actionViolation('v-02', 'reject');

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body).toEqual({ action: 'reject', reason: undefined });
    });
  });

  describe('getAnalytics', () => {
    it('fetches /analytics with no query when days is omitted', async () => {
      fetchSpy.mockResolvedValueOnce(mockOkJson({ total_violations: 0 }));

      await getAnalytics();

      expect(fetchSpy.mock.calls[0][0]).toContain('/analytics');
      expect(fetchSpy.mock.calls[0][0]).not.toContain('?');
    });

    it('fetches /analytics?days=N when days is provided', async () => {
      fetchSpy.mockResolvedValueOnce(mockOkJson({ total_violations: 10 }));

      await getAnalytics(30);

      expect(fetchSpy.mock.calls[0][0]).toContain('/analytics?days=30');
    });
  });

  describe('getEvidenceUrl', () => {
    it('returns the correct evidence URL', () => {
      const url = getEvidenceUrl('v-99');
      expect(url).toContain('/evidence/v-99');
    });

    it('includes the API base URL', () => {
      const url = getEvidenceUrl('abc');
      expect(url).toMatch(/^http:\/\/localhost:8000\/api\/v1\/evidence\/abc$/);
    });
  });

  describe('fetchJSON error handling', () => {
    it('throws on non-ok response with status and body', async () => {
      fetchSpy.mockResolvedValueOnce(mockError(500, 'Internal Server Error'));

      await expect(detectViolation(new File([''], 'x.jpg'))).rejects.toThrow(
        'API 500: Internal Server Error',
      );
    });

    it('throws on 404 with body text', async () => {
      fetchSpy.mockResolvedValueOnce(mockError(404, 'Not found'));

      await expect(getViolation('missing')).rejects.toThrow('API 404: Not found');
    });
  });
});
