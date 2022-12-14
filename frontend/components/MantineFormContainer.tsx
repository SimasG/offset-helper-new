import { erc20ABI, useAccount } from "wagmi";
import { Select, NumberInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { showNotification } from "@mantine/notifications";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import handleEstimate from "../utils/getEstimates";
import { BigNumber, ethers } from "ethers";
import { OffsetHelperABI } from "../constants";
import addresses, { OHPolygonAddress } from "../constants/constants";

const MantineFormContainer = () => {
  const [carbonTokens, setCarbonTokens] = useState<
    { label: string; value: string }[]
  >([
    { label: "BCT", value: "bct" },
    { label: "NCT", value: "nct" },
  ]);
  const [offsetMethods, setOffsetMethods] = useState<
    { label: string; value: string }[]
  >([
    { label: "Specify BCT", value: "bct" },
    { label: "Specify NCT", value: "nct" },
    { label: "Specify WMATIC", value: "wmatic" },
    { label: "Specify USDC", value: "usdc" },
    { label: "Specify WETH", value: "weth" },
    { label: "Specify MATIC", value: "matic" },
  ]);
  const [estimate, setEstimate] = useState<BigNumber | undefined>();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      paymentMethod: "",
      carbonToken: "",
      offsetMethod: "",
      // ** How do I specify `amountToOffset`'s types? I want to it be both `number` & `string`
      amountToOffset: undefined,
    },

    validateInputOnChange: true,

    validate: {
      paymentMethod: (value) => (value === "" ? `Required` : null),
      carbonToken: (value) => (value === "" ? `Required` : null),
      offsetMethod: (value) => (value === "" ? `Required` : null),
      amountToOffset: (value) =>
        typeof value === "number"
          ? value <= 0
            ? `Value must be above 0`
            : null
          : `Required`,
    },
  });

  console.log("form.values.amountToOffset:", form.values.amountToOffset);

  const { isConnected } = useAccount();

  useEffect(() => {
    const runHandleEstimate = async () => {
      if (
        form.values.paymentMethod &&
        form.values.carbonToken &&
        form.values.amountToOffset &&
        form.values.offsetMethod
      ) {
        setEstimate(
          await handleEstimate(
            form.values.paymentMethod,
            form.values.carbonToken,
            // @ts-ignore
            form.values.amountToOffset,
            form.values.offsetMethod
          )
        );
      } else {
        setEstimate(undefined);
      }
    };
    runHandleEstimate();
  }, [form.values]);

  const paymentMethods: { label: string; value: string }[] = [
    { label: "BCT", value: "bct" },
    { label: "NCT", value: "nct" },
    { label: "WMATIC", value: "wmatic" },
    { label: "USDC", value: "usdc" },
    { label: "WETH", value: "weth" },
    { label: "MATIC", value: "matic" },
  ];

  // * Functions
  // 1. Changing carbon token to offset option array according to which payment method was selected
  // E.g. if BCT payment method was selected, pre-select BCT as the carbon token to offset

  // 2. Changing offset method option array according to which payment method was selected
  // E.g. if BCT payment method was selected, pre-select "Specify BCT" as the offset method
  const handlePaymentMethod = (paymentMethod: string) => {
    if (paymentMethod === "bct" || paymentMethod === "nct") {
      form.setValues({
        paymentMethod: paymentMethod,
        carbonToken: paymentMethod,
        offsetMethod: paymentMethod,
      });
      setCarbonTokens([
        { label: paymentMethod.toUpperCase(), value: paymentMethod },
      ]);
      setOffsetMethods([
        {
          label: `Specify ${paymentMethod.toUpperCase()}`,
          value: paymentMethod,
        },
      ]);
    } else {
      form.setValues({
        paymentMethod: paymentMethod,
        offsetMethod: paymentMethod,
      });
      setCarbonTokens([
        { label: "BCT", value: "bct" },
        { label: "NCT", value: "nct" },
      ]);
      setOffsetMethods([
        { label: "Specify BCT", value: "bct" },
        { label: "Specify NCT", value: "nct" },
        {
          label: `Specify ${paymentMethod.toUpperCase()}`,
          value: paymentMethod,
        },
      ]);
    }
  };

  // Changing offset method option array according to which carbon token & payment method was chosen
  const handleCarbonToken = (paymentMethod: string, carbonToken: string) => {
    form.setValues({
      carbonToken: carbonToken,
      offsetMethod: carbonToken,
    });

    if (!paymentMethod) {
      setOffsetMethods([
        {
          label: `Specify ${carbonToken.toUpperCase()}`,
          value: carbonToken,
        },
      ]);
    } else {
      setOffsetMethods([
        {
          label: `Specify ${carbonToken.toUpperCase()}`,
          value: carbonToken,
        },
        {
          label: `Specify ${paymentMethod.toUpperCase()}`,
          value: paymentMethod,
        },
      ]);
    }
  };

  const handleOffsetMethod = (offsetMethod: string) => {
    if (offsetMethod === "bct" || offsetMethod === "nct") {
      form.setValues({
        carbonToken: offsetMethod,
        offsetMethod: offsetMethod,
      });
    } else {
      form.setValues({
        offsetMethod: offsetMethod,
      });

      setCarbonTokens([
        { label: "BCT", value: "bct" },
        { label: "NCT", value: "nct" },
      ]);
    }
  };

  // * Blockchain-related functionality
  // If paymentMethod = BCT/NCT -> autoOffsetPoolToken()
  // If paymentMethod = MATIC & offsetMethod = BCT/NCT -> autoOffsetExactOutETH()
  // If paymentMethod = MATIC & offsetMethod = MATIC -> autoOffsetExactInETH()
  // If paymentMethod = WMATIC/USDC/WETH & offsetMethod = BCT/NCT -> autoOffsetExactOutToken()
  // If paymentMethod = WMATIC/USDC/WETH & offsetMethod = WMATIC/USDC/WETH -> autoOffsetExactInToken()
  const handleOffset = async (
    paymentMethod: string,
    offsetMethod: string,
    amountToOffset: number
  ) => {
    if (paymentMethod === "bct" || paymentMethod === "nct") {
      await autoOffsetPoolToken(paymentMethod, amountToOffset);
    } else if (paymentMethod === "matic") {
      if (offsetMethod === "bct" || offsetMethod === "nct") {
        await autoOffsetExactOutETH(offsetMethod, amountToOffset);
      } else {
        await autoOffsetExactInETH(offsetMethod, amountToOffset);
      }
    } else {
      if (offsetMethod === "bct" || offsetMethod === "nct") {
        await autoOffsetExactOutToken(
          paymentMethod,
          offsetMethod,
          amountToOffset
        );
      } else {
        await autoOffsetExactInToken(
          paymentMethod,
          offsetMethod,
          amountToOffset
        );
      }
    }
  };

  // `handleOffset` helpers
  const autoOffsetPoolToken = async (
    paymentMethod: string,
    amountToOffset: number
  ) => {
    // @ts-ignore
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const oh = new ethers.Contract(OHPolygonAddress, OffsetHelperABI, signer);

    const poolToken = paymentMethod === "bct" ? addresses.bct : addresses.nct;

    // @ts-ignore
    const poolTokenContract = new ethers.Contract(poolToken, erc20ABI, signer);

    await (
      await poolTokenContract.approve(
        OHPolygonAddress,
        ethers.utils.parseEther(amountToOffset.toString())
      )
    ).wait();

    const offsetTx = await oh.autoOffsetPoolToken(
      poolToken,
      ethers.utils.parseEther(amountToOffset.toString())
    );

    await offsetTx.wait();
    console.log("offset hash", offsetTx.hash);
  };

  const autoOffsetExactOutETH = async (
    offsetMethod: string,
    amountToOffset: number
  ) => {
    // @ts-ignore
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const oh = new ethers.Contract(OHPolygonAddress, OffsetHelperABI, signer);

    const poolToken = offsetMethod === "bct" ? addresses.bct : addresses.nct;

    const offsetTx = await oh.autoOffsetExactOutETH(
      poolToken,
      ethers.utils.parseEther(amountToOffset.toString()),
      {
        value: estimate,
      }
    );
    await offsetTx.wait();
    console.log("offset hash", offsetTx.hash);
  };

  const autoOffsetExactInETH = async (
    offsetMethod: string,
    amountToOffset: number
  ) => {
    // @ts-ignore
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const oh = new ethers.Contract(OHPolygonAddress, OffsetHelperABI, signer);

    const poolToken = offsetMethod === "bct" ? addresses.bct : addresses.nct;

    // ** Not sure why I don't need to approve the MATIC tx here
    const offsetTx = await oh.autoOffsetExactInETH(poolToken, {
      value: ethers.utils.parseEther(amountToOffset.toString()),
    });

    await offsetTx.wait();
    console.log("offset hash", offsetTx.hash);
  };

  const autoOffsetExactOutToken = async (
    paymentMethod: string,
    offsetMethod: string,
    amountToOffset: number
  ) => {
    // @ts-ignore
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const oh = new ethers.Contract(OHPolygonAddress, OffsetHelperABI, signer);

    const poolToken = offsetMethod === "bct" ? addresses.bct : addresses.nct;

    const depositedToken = addresses[paymentMethod];

    const depositedTokenContract = new ethers.Contract(
      // @ts-ignore
      depositedToken,
      erc20ABI,
      signer
    );

    await (
      await depositedTokenContract.approve(OHPolygonAddress, estimate)
    ).wait();

    const offsetTx = await oh.autoOffsetExactOutToken(
      depositedToken,
      poolToken,
      ethers.utils.parseEther(amountToOffset.toString())
    );
    await offsetTx.wait();
    console.log("offset hash", offsetTx.hash);
  };

  const autoOffsetExactInToken = async (
    paymentMethod: string,
    offsetMethod: string,
    amountToOffset: number
  ) => {
    // @ts-ignore
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const oh = new ethers.Contract(OHPolygonAddress, OffsetHelperABI, signer);

    const poolToken = offsetMethod === "bct" ? addresses.bct : addresses.nct;

    const depositedToken = addresses[paymentMethod];

    const depositedTokenContract = new ethers.Contract(
      // @ts-ignore
      depositedToken,
      erc20ABI,
      signer
    );

    await (
      await depositedTokenContract.approve(OHPolygonAddress, estimate)
    ).wait();

    const offsetTx = await oh.autoOffsetExactInToken(
      depositedToken,
      ethers.utils.parseEther(amountToOffset.toString()),
      poolToken
    );

    await offsetTx.wait();
    console.log("offset hash", offsetTx.hash);
  };

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      if (isConnected) {
        {
          await handleOffset(
            values.paymentMethod,
            values.offsetMethod,
            // @ts-ignore
            values.amountToOffset
          );
          setLoading(false);
          toast.success(
            `${
              form.values.amountToOffset
            } ${form.values.paymentMethod.toUpperCase()} has been offset!`
          );
        }
      } else {
        toast.error("Connect to a Wallet first!");
      }
    } catch {
      setLoading(false);
    }
  };

  const handleError = (errors: typeof form.errors) => {
    if (errors.paymentMethod) {
      showNotification({ message: "Required input", color: "red" });
    }
    if (errors.carbonToken) {
      showNotification({ message: "Required input", color: "red" });
    }
    if (errors.offsetMethod) {
      showNotification({ message: "Required input", color: "red" });
    }
    if (errors.amountToOffset) {
      showNotification({ message: "Required input", color: "red" });
    }
  };

  return (
    <>
      <form
        onSubmit={form.onSubmit(handleSubmit, handleError)}
        className="px-14 py-7 sm:px-20 sm:py-10 bg-white rounded-lg shadow-lg drop-shadow-md shadow-[#d4eed4]"
      >
        {/* Input Container */}
        <div className="flex flex-col gap-4">
          {/* Payment Method */}
          <Select
            label="Payment Method"
            placeholder="Select an option"
            {...form.getInputProps("paymentMethod")}
            data={paymentMethods}
            value={form.values.paymentMethod}
            onChange={(e: string) => {
              handlePaymentMethod(e);
            }}
            className="text-5xl"
          />

          {/* Carbon Token */}
          <Select
            label="Carbon Token to Offset"
            placeholder="Select an option"
            {...form.getInputProps("carbonToken")}
            data={carbonTokens}
            value={form.values.carbonToken}
            onChange={(e: string) => {
              handleCarbonToken(form.values.paymentMethod, e);
            }}
          />

          {/* Offset Method */}
          <Select
            label="Offset Method"
            placeholder="Select an option"
            {...form.getInputProps("offsetMethod")}
            data={offsetMethods}
            value={form.values.offsetMethod}
            onChange={(e: string) => {
              handleOffsetMethod(e);
            }}
          />

          {/* Amount to Offset */}
          <NumberInput
            label={`Amount of ${form.values.offsetMethod.toUpperCase()} to Offset`}
            {...form.getInputProps("amountToOffset")}
            min={0}
            max={43860}
            precision={2}
            placeholder={0}
            // defaultValue={""}
            removeTrailingZeros={true}
          />
        </div>

        {form.values.offsetMethod && form.values.paymentMethod && (
          <>
            {(form.values.paymentMethod === "bct" &&
              form.values.offsetMethod === "bct") ||
            (form.values.paymentMethod === "nct" &&
              form.values.offsetMethod === "nct") ? null : (
              <>
                {form.values.carbonToken !== "" &&
                // @ts-ignore
                (form.values.amountToOffset !== 0 ||
                  form.values.amountToOffset !== "") &&
                form.values.amountToOffset !== undefined
                  ? (form.values.paymentMethod === "matic" ||
                      form.values.paymentMethod === "wmatic" ||
                      form.values.paymentMethod === "usdc" ||
                      form.values.paymentMethod === "weth") &&
                    (form.values.offsetMethod === "bct" ||
                      form.values.offsetMethod === "nct")
                    ? estimate && (
                        <p className="text-[14px] text-gray-400 pt-1">
                          <>
                            Estimated cost:{" "}
                            {form.values.paymentMethod === "usdc"
                              ? (
                                  parseInt(estimate.toString()) /
                                  10 ** 6
                                ).toFixed(2)
                              : (
                                  parseInt(estimate.toString()) /
                                  10 ** 18
                                ).toFixed(2)}{" "}
                            {form.values.paymentMethod.toUpperCase()}
                          </>
                        </p>
                      )
                    : estimate && (
                        <p className="text-[14px] text-gray-400 pt-1">
                          <>
                            Equivalent to offsetting{" "}
                            {(parseInt(estimate.toString()) / 10 ** 18).toFixed(
                              2
                            )}{" "}
                            {form.values.carbonToken.toUpperCase()}
                          </>
                        </p>
                      )
                  : null}
              </>
            )}
          </>
        )}

        {/* Offset Button */}
        <div className="mt-8 font-bold text-center">
          <button
            disabled={loading}
            className="px-4 py-2 text-white bg-green-500 rounded-sm hover:bg-green-300 drop-shadow-lg disabled:opacity-50 disabled:bg-green-300"
            type="submit"
          >
            OFFSET
          </button>
        </div>
      </form>
    </>
  );
};

export default MantineFormContainer;
