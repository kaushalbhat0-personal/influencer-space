import { ContactService } from "@/services/contact.service";
import { MessagesList } from "./_components/messages-list";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const messages = await ContactService.findAll();

  return <MessagesList messages={messages} />;
}
