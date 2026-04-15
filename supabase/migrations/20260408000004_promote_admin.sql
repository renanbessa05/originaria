-- Promove o email especificado para admin

UPDATE public.profiles 
SET role = 'admin'::public.user_role
WHERE email = 'pioizin01@gmail.com';
