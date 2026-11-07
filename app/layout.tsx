import type { Metadata, Viewport } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/features/i18n/LanguageSwitcher";
import { ActiveWorkoutProvider } from "@/features/logging/context/ActiveWorkoutContext";
import { BottomNav } from "@/shared/ui/BottomNav";
import { ConvexClientProvider } from "@/shared/ui/ConvexClientProvider";
import { DisableZoom } from "@/shared/ui/DisableZoom";
import { InstallPrompt } from "@/shared/ui/InstallPrompt";
import { ServiceWorkerRegister } from "@/shared/ui/ServiceWorkerRegister";
import { SheetHost } from "@/shared/ui/SheetHost";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("metadata");
	return {
		title: t("title"),
		description: t("description"),
		appleWebApp: {
			title: t("shortName"),
			statusBarStyle: "black-translucent",
		},
	};
}

export const viewport: Viewport = {
	themeColor: "#000000",
	colorScheme: "dark",
	interactiveWidget: "resizes-content",
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const locale = await getLocale();
	const messages = await getMessages();

	return (
		<ConvexAuthNextjsServerProvider>
			<html
				lang={locale}
				className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
			>
				<body className="min-h-full bg-bg text-ink">
					<NextIntlClientProvider locale={locale} messages={messages}>
						<ServiceWorkerRegister />
						<DisableZoom />
						<InstallPrompt />
						<ConvexClientProvider>
							<SheetHost>
								<ActiveWorkoutProvider>
									<div className="mx-auto w-full max-w-130 px-4.5 pt-5 pb-30 md:max-w-180 lg:max-w-250 xl:max-w-280">
										<LanguageSwitcher />
										{children}
									</div>
									<BottomNav />
								</ActiveWorkoutProvider>
							</SheetHost>
						</ConvexClientProvider>
					</NextIntlClientProvider>
				</body>
			</html>
		</ConvexAuthNextjsServerProvider>
	);
}
