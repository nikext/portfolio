import Cursor from "@/components/Cursor";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Loader from "@/components/Loader";
import Progress from "@/components/Progress";

export default function Home() {
  return (
    <>
      <Loader />
      <Progress />
      <Cursor />
      <Header />
      <main>
        <Hero />
      </main>
    </>
  );
}
