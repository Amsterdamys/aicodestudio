import { handleContact, type Env } from '../../src/server/contact';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) => handleContact(request, env);
