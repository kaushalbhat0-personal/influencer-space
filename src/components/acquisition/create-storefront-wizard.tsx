"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { executeStrategy, acquireAndProvision } from "@/actions/acquisition/acquire.actions";
import type { AcquisitionResult, AcquisitionStrategy } from "@/lib/acquisition/types";
import type { WizardStep } from "./types";
import { StrategySelector } from "./strategy-selector";
import { StrategyInputHost } from "./strategy-input-host";
import { AcquisitionPreview } from "./acquisition-preview";
import { ProvisionProgress } from "./provision-progress";
import { SuccessScreen } from "./success-screen";
import type { BusinessProfile } from "@/lib/acquisition/business-types";

interface ProgressStage {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed";
}

const PROGRESS_STAGES: { id: string; label: string }[] = [
  { id: "acquire", label: "Acquiring data" },
  { id: "normalize", label: "Normalizing profile" },
  { id: "provision", label: "Creating workspace" },
  { id: "publish", label: "Publishing storefront" },
  { id: "complete", label: "Finalizing" },
];

export function CreateStorefrontWizard({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState<WizardStep>("strategy");
  const [strategyId, setStrategyId] = useState<string | null>(null);
  const [acquisitionResult, setAcquisitionResult] = useState<AcquisitionResult | null>(null);
  const [editedProfile, setEditedProfile] = useState<BusinessProfile | null>(null);
  const [rawInput, setRawInput] = useState("");
  const [provisioning, setProvisioning] = useState(false);
  const [progressStages, setProgressStages] = useState<ProgressStage[]>(
    PROGRESS_STAGES.map((s) => ({ ...s, status: "pending" })),
  );
  const [successData, setSuccessData] = useState<{
    storefrontUrl: string; tenantId: string; creatorName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goTo = useCallback((s: WizardStep) => {
    setStep(s);
    setError(null);
  }, []);

  const handleStrategySelect = useCallback((id: string) => {
    setStrategyId(id);
    setRawInput("");
    setAcquisitionResult(null);
    goTo("input");
  }, [goTo]);

  const handleAcquired = useCallback(async (input: string) => {
    if (!strategyId) return;
    setRawInput(input);
    goTo("preview");
    setAcquisitionResult(null);

    setProgressStages((prev) =>
      prev.map((s) => s.id === "acquire" ? { ...s, status: "running" } : s),
    );

    try {
      const result = await executeStrategy(strategyId as AcquisitionStrategy, input);
      setAcquisitionResult(result);
      setProgressStages((prev) =>
        prev.map((s) => s.id === "acquire" ? { ...s, status: "completed" } : s),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Acquisition failed");
      setProgressStages((prev) =>
        prev.map((s) => s.id === "acquire" ? { ...s, status: "failed" } : s),
      );
    }
  }, [strategyId, goTo]);

  const handleProvision = useCallback(async () => {
    if (!strategyId || !acquisitionResult) return;
    const profile = editedProfile || acquisitionResult.profile;
    setProvisioning(true);
    setError(null);
    goTo("provisioning");

    setProgressStages(PROGRESS_STAGES.map((s) => {
      if (s.id === "acquire" || s.id === "normalize") return { ...s, status: "completed" as const };
      if (s.id === "provision") return { ...s, status: "running" as const };
      return { ...s, status: "pending" as const };
    }));

    try {
      const result = await acquireAndProvision(strategyId as AcquisitionStrategy, rawInput, profile);

      if (result.success) {
        setProgressStages((prev) =>
          prev.map((s) =>
            s.id === "provision" || s.id === "publish" || s.id === "complete"
              ? { ...s, status: "completed" as const }
              : s,
          ),
        );
        setSuccessData({
          storefrontUrl: result.storefrontUrl,
          tenantId: result.tenantId,
          creatorName: profile.businessName,
        });
        goTo("success");
      } else {
        setError(result.error || "Provisioning failed");
        setProgressStages((prev) =>
          prev.map((s) =>
            s.status === "running" ? { ...s, status: "failed" as const } : s,
          ),
        );
        goTo("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Provisioning failed");
      setProgressStages((prev) =>
        prev.map((s) =>
          s.status === "running" ? { ...s, status: "failed" as const } : s,
        ),
      );
      goTo("error");
    } finally {
      setProvisioning(false);
    }
  }, [strategyId, acquisitionResult, editedProfile, rawInput, goTo]);

  const handleReset = useCallback(() => {
    setStep("strategy");
    setStrategyId(null);
    setAcquisitionResult(null);
    setEditedProfile(null);
    setRawInput("");
    setSuccessData(null);
    setError(null);
    setProgressStages(PROGRESS_STAGES.map((s) => ({ ...s, status: "pending" })));
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {(["strategy", "input", "preview", "provisioning", "success"] as WizardStep[]).map((s, i) => {
          const stepIndex = ["strategy", "input", "preview", "provisioning", "success"].indexOf(step);
          const isActive = i <= stepIndex;
          return (
            <div key={s} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium ${
                  isActive ? "bg-[var(--brand-primary)] text-white" : "bg-zinc-800 text-zinc-600"
                }`}
              >
                {i + 1}
              </span>
              {i < 4 && <span className={`h-px w-6 ${isActive ? "bg-[var(--brand-primary)]/40" : "bg-zinc-800"}`} />}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {step === "strategy" && (
            <StrategySelector
              selected={strategyId}
              onSelect={handleStrategySelect}
            />
          )}

          {step === "input" && strategyId && (
            <StrategyInputHost
              strategyId={strategyId}
              onAcquired={handleAcquired}
              onBack={() => goTo("strategy")}
            />
          )}

          {step === "preview" && acquisitionResult && (
            <AcquisitionPreview
              result={acquisitionResult}
              onConfirm={handleProvision}
              onBack={() => goTo("input")}
              provisioning={provisioning}
            />
          )}

          {step === "provisioning" && (
            <ProvisionProgress
              stages={progressStages}
              currentLabel={
                progressStages.find((s) => s.status === "running")?.label ||
                progressStages.find((s) => s.status === "failed")?.label
              }
            />
          )}

          {step === "error" && (
            <div className="text-center space-y-4">
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                <p className="text-sm text-red-400">{error || "Something went wrong"}</p>
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={handleReset} className="btn-primary px-6 py-2.5 text-sm">
                  Try Again
                </button>
                {onClose && (
                  <button onClick={onClose} className="btn-secondary px-6 py-2.5 text-sm">
                    Close
                  </button>
                )}
              </div>
            </div>
          )}

          {step === "success" && successData && (
            <SuccessScreen
              storefrontUrl={successData.storefrontUrl}
              tenantId={successData.tenantId}
              creatorName={successData.creatorName}
              onCreateAnother={handleReset}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
