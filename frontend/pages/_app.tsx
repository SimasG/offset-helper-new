import "../styles/globals.css";
import type { AppProps } from "next/app";
import { Lato } from "@next/font/google";
import { Toaster } from "react-hot-toast";

// Additional `rainbowkit` & `wagmi` setup
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultWallets, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { configureChains, createClient, WagmiConfig, chain } from "wagmi";
import { publicProvider } from "wagmi/providers/public";
import { alchemyProvider } from "wagmi/providers/alchemy";

// Connecting chains we support with providers we have
const { chains, provider } = configureChains(
  [chain.polygon],
  [
    // alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY }),
    publicProvider(),
  ]
);

// `connectors` are the wallets we'll support
// Creating a list of connectors we'll support on RainbowKit
// & sharing the list with the wagmiClient
const { connectors } = getDefaultWallets({
  appName: "Offset Helper App",
  chains,
});

// Initializing a wagmi client that combines all the above information, that RainbowKit
// will use under the hood
const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-lato",
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <WagmiConfig client={wagmiClient}>
      <Toaster
        toastOptions={{
          className: "",
          style: {
            fontFamily: "lato",
            fontWeight: "medium",
          },
        }}
      />
      <RainbowKitProvider chains={chains}>
        <main className={lato.className}>
          <Component {...pageProps} />
        </main>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default MyApp;
