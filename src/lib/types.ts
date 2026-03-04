import type { auth } from "./auth";

export type AppVariables = {
	user: typeof auth.$Infer.Session.user | null;
	session: typeof auth.$Infer.Session.session | null;
};

export type AppContext = { Variables: AppVariables };