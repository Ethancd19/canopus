import ContactClient from "@/components/ContactClient";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ContactPage({ searchParams }: { searchParams: SearchParams }) {
  const { subject } = await searchParams;
  return <ContactClient initialSubject={typeof subject === "string" ? subject : undefined} />;
}
