import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Baseline, BaselineComparison, Requirement } from '../types';
import mockApiClient from '../services/MockApiClient';
import { Button, Loading, ErrorMessage } from '../components';

const BaselineComparisonPage: React.FC = () => {
  const { baselineId } = useParams<{ baselineId: string }>();
  const navigate = useNavigate();
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [targetId, setTargetId] = useState<string>('current');
  const [comparison, setComparison] = useState<BaselineComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBaseline();
  }, [baselineId]);

  useEffect(() => {
    if (baseline) {
      performComparison();
    }
  }, [baseline, targetId]);

  const loadBaseline = async () => {
    if (!baselineId) return;

    try {
      setLoading(true);
      setError(null);
      const [baselineData, baselinesData] = await Promise.all([
        mockApiClient.getBaseline(baselineId),
        mockApiClient.getBaselines(),
      ]);

      if (!baselineData) {
        setError('Baseline not found');
        return;
      }

      setBaseline(baselineData);
      setBaselines(baselinesData.filter((b) => b.id !== baselineId));
    } catch (err) {
      setError('Failed to load baseline');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const performComparison = async () => {
    if (!baselineId) return;

    try {
      setComparing(true);
      setError(null);
      const comparisonData = await mockApiClient.compareBaselines(baselineId, targetId);
      setComparison(comparisonData);
    } catch (err) {
      setError('Failed to compare baselines');
      console.error(err);
    } finally {
      setComparing(false);
    }
  };

  const renderFieldValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const renderRequirementCard = (req: Requirement, type: 'added' | 'deleted') => (
    <div
      key={req.id}
      className={`border rounded p-4 mb-3 ${
        type === 'added' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="font-mono text-sm font-medium">{req.displayId}</span>
          <h3 className="font-medium">{req.title}</h3>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs ${
            type === 'added'
              ? 'bg-green-200 text-green-800'
              : 'bg-red-200 text-red-800'
          }`}
        >
          {type === 'added' ? 'Added' : 'Deleted'}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-2">{req.description}</p>
      <div className="flex gap-4 text-xs text-gray-500">
        <span>Type: {req.type}</span>
        <span>Status: {req.status}</span>
        <span>Priority: {req.priority}</span>
      </div>
    </div>
  );

  const renderModifiedRequirement = (item: {
    baseline: Requirement;
    current: Requirement;
    changedFields: string[];
  }) => (
    <div key={item.current.id} className="border rounded p-4 mb-3 bg-yellow-50 border-yellow-200">
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="font-mono text-sm font-medium">{item.current.displayId}</span>
          <h3 className="font-medium">{item.current.title}</h3>
        </div>
        <span className="px-2 py-1 rounded text-xs bg-yellow-200 text-yellow-800">
          Modified
        </span>
      </div>
      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium text-gray-700">Changed fields:</p>
        {item.changedFields.map((field) => (
          <div key={field} className="bg-white rounded p-2 text-sm">
            <div className="font-medium text-gray-700 mb-1">{field}:</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-gray-500 mb-1">Baseline:</div>
                <div className="text-red-700 line-through">
                  {renderFieldValue(item.baseline[field as keyof Requirement])}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Current:</div>
                <div className="text-green-700">
                  {renderFieldValue(item.current[field as keyof Requirement])}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return <Loading />;
  }

  if (!baseline) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorMessage message="Baseline not found" />
        <Button onClick={() => navigate('/baselines')} className="mt-4">
          Back to Baselines
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="secondary" onClick={() => navigate('/baselines')} className="mb-4">
          ← Back to Baselines
        </Button>
        <h1 className="text-3xl font-bold mb-2">Baseline Comparison</h1>
        <p className="text-gray-600">Compare {baseline.name} with another baseline or current state</p>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block font-medium mb-2">Source Baseline</label>
            <div className="border rounded p-3 bg-gray-50">
              <div className="font-medium">{baseline.name}</div>
              <div className="text-sm text-gray-600">
                Created: {new Date(baseline.createdAt).toLocaleString()}
              </div>
              {baseline.locked && (
                <span className="inline-block mt-2 px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                  Locked
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="block font-medium mb-2">Compare With</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="current">Current State</option>
              {baselines.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} - {new Date(b.createdAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {comparing ? (
        <Loading />
      ) : comparison ? (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Summary</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded">
                <div className="text-3xl font-bold text-green-700">{comparison.added.length}</div>
                <div className="text-sm text-gray-600">Added</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded">
                <div className="text-3xl font-bold text-yellow-700">
                  {comparison.modified.length}
                </div>
                <div className="text-sm text-gray-600">Modified</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded">
                <div className="text-3xl font-bold text-red-700">{comparison.deleted.length}</div>
                <div className="text-sm text-gray-600">Deleted</div>
              </div>
            </div>
          </div>

          {comparison.added.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4 text-green-700">
                Added Requirements ({comparison.added.length})
              </h2>
              {comparison.added.map((req) => renderRequirementCard(req, 'added'))}
            </div>
          )}

          {comparison.modified.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4 text-yellow-700">
                Modified Requirements ({comparison.modified.length})
              </h2>
              {comparison.modified.map((item) => renderModifiedRequirement(item))}
            </div>
          )}

          {comparison.deleted.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4 text-red-700">
                Deleted Requirements ({comparison.deleted.length})
              </h2>
              {comparison.deleted.map((req) => renderRequirementCard(req, 'deleted'))}
            </div>
          )}

          {comparison.added.length === 0 &&
            comparison.modified.length === 0 &&
            comparison.deleted.length === 0 && (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-gray-600">No differences found between the selected baselines</p>
              </div>
            )}
        </div>
      ) : null}
    </div>
  );
};

export default BaselineComparisonPage;
