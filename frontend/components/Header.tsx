import { ConnectButton } from "@rainbow-me/rainbowkit";
// import * as wagmi from "wagmi";
// console.log(wagmi);

const Header = () => {
  return (
    <div className="flex items-center justify-end p-4 mb-12 sm:mb-24">
      <ConnectButton />
    </div>
  );
};

export default Header;
