import Image from "next/image";

import { formatTruckOrderNo } from "../truck-order-lib";
import {
  DocCard,
  docDateTime,
  DocRow,
  type TruckOrderPrintData,
} from "./print-doc";

/** Cargo Loading Slip — Seapol's own document (image 2). */
export function LoadingSlip({ data }: { data: TruckOrderPrintData }) {
  return (
    <DocCard>
      <div className="flex items-start gap-3 border-b-2 border-gray-700 pb-3">
        <Image
          src="/seapollogo.png"
          alt="Seapol"
          width={96}
          height={72}
          className="h-12 w-auto object-contain"
        />
        <div className="flex-1 text-center">
          <h1 className="text-lg font-extrabold">
            Seaport Logistics Pvt. Ltd.
          </h1>
          <p className="text-xs font-medium">
            B-32, World Trade Avenue, Harbour Estate,
          </p>
          <p className="text-xs font-medium">
            TUTICORIN - 628 004, Tel: 4200544
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="border-2 border-gray-700 px-3 py-1 text-sm font-bold tracking-wide">
          CARGO LOADING SLIP
        </span>
        <span className="text-sm">
          <span className="font-semibold">SL.No. </span>
          <span className="text-base font-bold">
            {formatTruckOrderNo(data.seq)}
          </span>
        </span>
      </div>

      <div className="mt-4 space-y-1">
        <DocRow label="Date" value={docDateTime(data.loadingSlipAt)} />
        <DocRow label="Vehicle No." value={data.vehicleNo} strong />
        <DocRow
          label="Loading Site"
          value={data.loadingSiteName ?? "—"}
          strong
        />
      </div>

      <div className="mt-10 flex justify-end">
        <div className="text-center">
          <div className="h-10" />
          <p className="border-t border-gray-500 px-6 pt-1 text-sm font-bold tracking-widest">
            SEAPOL
          </p>
        </div>
      </div>
    </DocCard>
  );
}
