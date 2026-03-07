import { useState } from 'react';
import { trpc } from './lib/trpc';
import { 
  Scissors, 
  Calendar, 
  Phone, 
  User, 
  Clock, 
  UserPlus, 
  Loader2, 
  PlusCircle, 
  DollarSign,
  List 
} from 'lucide-react';

function Admin() {
  // --- ESTADOS PARA BARBEIROS ---
  const [profName, setProfName] = useState('');

  // --- ESTADOS PARA SERVIÇOS ---
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState(30);
  const [serviceDescription, setServiceDescription] = useState('');

  // --- Ler dados da Base de Dados ---
  const appointments = trpc.appointments.list.useQuery({ limit: 10 });
  
  // Buscar a lista de Barbeiros
  const professionalsList = trpc.professionals.list.useQuery();
  
  //  Buscar a lista de Serviços
  const servicesList = trpc.services.list.useQuery();

  const createProfessional = trpc.professionals.create.useMutation({
    onSuccess: () => {
      setProfName('');
      alert("Barbeiro cadastrado com sucesso! 💈");
      professionalsList.refetch(); 
    }
  });

  const createService = trpc.services.create.useMutation({
    onSuccess: () => {
      setServiceName('');
      setServicePrice('');
      setServiceDuration(30);
      setServiceDescription('');
      alert("Serviço cadastrado com sucesso! ✂️");
      servicesList.refetch();
    },
    onError: (err) => {
      alert("Erro ao cadastrar serviço: " + err.message);
    }
  });

  //(Funções dos Botões) ---
  const handleAddProfessional = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profName.trim()) return;
    createProfessional.mutate({
      name: profName,
      profileId: '11111111-1111-1111-1111-111111111111' 
    });
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim() || !servicePrice.trim()) return;

    createService.mutate({
      name: serviceName,
      price: servicePrice,
      durationMin: Number(serviceDuration),
      description: serviceDescription,
      profileId: '11111111-1111-1111-1111-111111111111'
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased font-sans">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-lg">
              <Scissors className="w-6 h-6 text-zinc-950" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">BarberFlow</h1>
          </div>
          <div className="text-sm text-zinc-400 font-medium">Painel Administrativo</div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        
        {/* --- GRID DE FORMULÁRIOS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* Formulário: Novo Barbeiro */}
          <section className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm flex flex-col">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <UserPlus className="text-amber-500 w-5 h-5" /> Novo Barbeiro
            </h3>
            <form onSubmit={handleAddProfessional} className="flex flex-col gap-3 mb-6">
              <input 
                type="text" 
                value={profName}
                onChange={(e) => setProfName(e.target.value)}
                placeholder="Nome do barbeiro"
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 focus:border-amber-500 outline-none transition-all"
                required
              />
              <button 
                type="submit" 
                disabled={createProfessional.isLoading}
                className="bg-amber-500 text-zinc-950 font-bold py-2 rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {createProfessional.isLoading ? "..." : "Cadastrar Barbeiro"}
              </button>
            </form>

            {/* Lista Visual de Barbeiros */}
            <div className="mt-auto border-t border-zinc-800 pt-4">
              <h4 className="text-sm text-zinc-400 font-bold mb-3 flex items-center gap-2">
                <List className="w-4 h-4" /> Barbeiros Registados
              </h4>
              {professionalsList.isLoading ? (
                <div className="text-sm text-zinc-500">A carregar...</div>
              ) : professionalsList.data?.length === 0 ? (
                <div className="text-sm text-zinc-600 italic">Nenhum barbeiro registado.</div>
              ) : (
                <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {professionalsList.data?.map(prof => (
                    <li key={prof.id} className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg flex justify-between items-center text-sm">
                      <span className="font-medium">{prof.name}</span>
                      <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-md">Ativo</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Formulário: Novo Serviço */}
          <section className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm flex flex-col">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <PlusCircle className="text-emerald-500 w-5 h-5" /> Novo Serviço
            </h3>
            <form onSubmit={handleAddService} className="grid grid-cols-2 gap-3 mb-6">
              <input 
                type="text" 
                placeholder="Ex: Corte Social" 
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="col-span-2 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 focus:border-emerald-500 outline-none transition-all"
                required
              />
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Preço" 
                  value={servicePrice}
                  onChange={(e) => setServicePrice(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 focus:border-emerald-500 outline-none transition-all"
                  required
                />
              </div>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input 
                  type="number" 
                  placeholder="Minutos" 
                  value={serviceDuration}
                  onChange={(e) => setServiceDuration(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 focus:border-emerald-500 outline-none transition-all"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={createService.isLoading}
                className="col-span-2 bg-emerald-600 text-white font-bold py-2 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors mt-1"
              >
                {createService.isLoading ? "..." : "Cadastrar Serviço"}
              </button>
            </form>

            {/* Lista Visual de Serviços */}
            <div className="mt-auto border-t border-zinc-800 pt-4">
              <h4 className="text-sm text-zinc-400 font-bold mb-3 flex items-center gap-2">
                <List className="w-4 h-4" /> Serviços Registados
              </h4>
              {servicesList.isLoading ? (
                <div className="text-sm text-zinc-500">A carregar...</div>
              ) : servicesList.data?.length === 0 ? (
                <div className="text-sm text-zinc-600 italic">Nenhum serviço registado.</div>
              ) : (
                <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {servicesList.data?.map(service => (
                    <li key={service.id} className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg flex flex-col justify-center text-sm gap-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{service.name}</span>
                        <span className="text-emerald-400 font-bold">R$ {service.price}</span>
                      </div>
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {service.durationMin} min
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

        </div>

        {/* --- LISTA DE AGENDAMENTOS --- */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white">Agendamentos</h2>
            <p className="text-zinc-400 mt-1">Visualize e gerencie os horários marcados.</p>
          </div>
        </div>

        <div className="grid gap-4">
          {appointments.isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-zinc-900 rounded-xl border border-zinc-800" />
              ))}
            </div>
          ) : appointments.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl">
              <Calendar className="w-12 h-12 text-zinc-700 mb-4" />
              <p className="text-zinc-500 text-lg">Nenhum agendamento encontrado no banco de dados.</p>
            </div>
          ) : (
            appointments.data?.map((appt) => (
              <div 
                key={appt.id} 
                className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl hover:border-amber-500/50 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center justify-center bg-zinc-800 w-16 h-16 rounded-lg border border-zinc-700 text-zinc-300">
                    <span className="text-xs uppercase font-bold text-zinc-500">Hoje</span>
                    <span className="text-xl font-black text-amber-500">
                      {new Date(appt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-zinc-500" />
                      <h3 className="font-bold text-white text-lg">{appt.clientName}</h3>
                    </div>
                    <div className="flex gap-4 text-sm text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> {appt.clientPhone}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> 
                        {appt.service?.name ?? 'Serviço não definido'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    appt.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {appt.status}
                  </span>
                  <span className="text-xs text-zinc-600 font-mono">{appt.id.split('-')[0]}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default Admin;