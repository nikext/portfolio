import About from "@/components/About";
import Contact from "@/components/Contact";
import Cursor from "@/components/Cursor";
import Experience from "@/components/Experience";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Loader from "@/components/Loader";
import Marquee from "@/components/Marquee";
import Progress from "@/components/Progress";
import Proof from "@/components/Proof";
import Reveal from "@/components/Reveal";
import Stack from "@/components/Stack";

export default function Home() {
  return (
    <>
      <Loader />
      <Progress />
      <Cursor />
      <Reveal />
      <Header />
      <main>
        <Hero />
        <Marquee />
        <About />
        <Experience />
        <Stack />
        <Proof />
        <Contact />
      </main>
    </>
  );
}
