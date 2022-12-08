import type { NextPage } from "next";
import FormikContainer from "../components/form/FormikContainer";
import Header from "../components/Header";
import Head from "next/head";
import MantineFormContainer from "../components/MantineFormContainer";

const Home: NextPage = () => {
  return (
    <div>
      <Head>
        <title>Offset Helper</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <Header />
      <div className="absolute flex flex-col items-center justify-start w-full h-full gap-20">
        <div className="flex flex-col items-center justify-center gap-5">
          <h1 className="text-5xl font-bold">
            Offset Your <span className="text-red-500">Emissions</span> Easily
          </h1>
          <p className="text-lg font-bold">
            Effortlessly retire carbon credits with our Offset Helper
          </p>
        </div>
        {/* <FormikContainer /> */}
        <MantineFormContainer />
      </div>
    </div>
  );
};

export default Home;
