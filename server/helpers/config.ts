import { BankAccount } from "@/admin/components/Contacts";
import Conf from "conf";
import { join } from "path";

export type Config = {
  lexoffice: {
    apiKey: string;
    voucherStatus: string;
    dateRange: {
      startDate: string;
      endDate: string;
    };
  };
  accounts: BankAccount[];
  creditor: {
    iban: string;
    bic: string;
    identification: string;
    name: string;
    reqdColltnDate: string;
  };
};

export const config = new Conf<Config>({
  cwd: join(process.cwd(), "config"),
  defaults: {
    lexoffice: {
      apiKey: "",
      voucherStatus: "draft",
      dateRange: {
        startDate: "",
        endDate: "",
      },
    },
    accounts: [],
    creditor: {
      iban: "",
      bic: "",
      identification: "",
      name: "",
      reqdColltnDate: "",
    },
  },
  clearInvalidConfig: true,
});
