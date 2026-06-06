import { CreditCard, UserPlus } from "lucide-react";

const ACTIONS_ADMIN = [
  { label: "Registrar Pago", Icon: CreditCard, color: "bg-[#9A2A46] text-white" },
  { label: "Nuevo Staff", Icon: UserPlus, color: "bg-white border border-gray-200 text-gray-700" },
];

const ACTIONS_EMPLOYEE = [
  { label: "Registrar Pago", Icon: CreditCard, color: "bg-[#9A2A46] text-white" },
];

export default function StaffQuickActions({ isEmployee = false }) {
  const actions = isEmployee ? ACTIONS_EMPLOYEE : ACTIONS_ADMIN;

  return (
    <section className="flex flex-col gap-sm">
      <h3 className="text-label-md text-on-surface uppercase tracking-wider">
        Acciones rápidas
      </h3>
      <div className="flex gap-3 flex-wrap">
        {actions.map(({ label, Icon, color }) => (
          <button
            key={label}
            type="button"
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold shadow-sm transition-colors ${color}`}
          >
            <Icon className="size-5" />
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}