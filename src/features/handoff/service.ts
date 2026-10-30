import type { DataGateway } from "../../core/gateway";
import type { Loan, PhotoStep, QrChallenge } from "../../core/types";
import { imageExtension } from "../../core/errors";
export interface LockerGateway {
  getQr(loan: Loan): Promise<QrChallenge>;
  simulateScan(challenge: QrChallenge): Promise<void>;
}
export const makeSimulatedLocker = (api: DataGateway): LockerGateway => ({
  getQr: (loan) =>
    api.rpc<QrChallenge>("get_handoff_qr", {
      target: loan.id,
      expected_revision: loan.revision,
    }),
  async simulateScan(challenge) {
    await api.rpc("simulate_locker_scan", { challenge: challenge.id });
  },
});
export function makeHandoffService(api: DataGateway, locker: LockerGateway) {
  return {
    getQr: locker.getQr,
    simulateScan: locker.simulateScan,
    getReturnChecklist: (loan: Loan) => loan.checklist,
    uploadPhoto: (loanId: string, step: PhotoStep, file: File) =>
      api.upload(
        "loan-verification",
        `${loanId}/${step}/${crypto.randomUUID()}.${imageExtension(file)}`,
        file,
      ),
    async recordPhoto(
      loanId: string,
      step: PhotoStep,
      path: string,
      answers: string[],
    ) {
      await api.rpc("record_handoff_photo", {
        target: loanId,
        step,
        image_path: path,
        answers,
      });
    },
  };
}
