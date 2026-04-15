"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (isRegister) {
      const { error } = await supabase.auth.signUp({
        email, 
        password, 
        options: { data: { full_name: name } }
      });
      if (error) {
        setErrorMsg(error.message);
      } else { 
        alert('Conta criada com sucesso! Você já pode fazer login.'); 
        setIsRegister(false); 
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMsg(error.message === 'Invalid login credentials' ? 'Email ou senha inválidos.' : error.message);
      } else {
        window.location.href = '/checkout';
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-neutral-100">
        <h1 className="text-2xl font-bold text-neutral-900 mb-6 text-center">
          {isRegister ? 'Criar Conta' : 'Acesse sua conta'}
        </h1>
        
        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Nome Completo</label>
              <input 
                type="text" 
                required 
                value={name} 
                onChange={e => setName(e.target.value)}
                className="w-full border border-neutral-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-neutral-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Senha</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-neutral-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
            />
          </div>
          
          <Button type="submit" disabled={loading} className="w-full py-6 text-base mt-2">
            {loading ? 'Aguarde...' : (isRegister ? 'Cadastrar' : 'Entrar e Continuar')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          {isRegister ? 'Já tem uma conta? ' : 'Não possui conta? '}
          <button 
            type="button" 
            onClick={() => setIsRegister(!isRegister)} 
            className="text-neutral-900 font-semibold hover:underline"
          >
            {isRegister ? 'Faça login' : 'Cadastre-se'}
          </button>
        </p>
      </div>
    </div>
  );
}
