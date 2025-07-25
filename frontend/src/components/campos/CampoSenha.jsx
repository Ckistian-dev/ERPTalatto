import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function CampoSenha({ label, name, value, onChange, obrigatorio = false, placeholder = "" }) {
    const [visivel, setVisivel] = useState(false);

    return (
        <div>
            <label className="block mb-1 font-medium text-gray-700">
                {label}
                {obrigatorio && <span className="text-red-600">*</span>}
            </label>
            <div className="relative">
                <input
                    type={visivel ? 'text' : 'password'}
                    name={name}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className="w-full border border-gray-300 p-2 rounded pr-10" // Adicionado padding à direita
                />
                <button
                    type="button"
                    onClick={() => setVisivel(!visivel)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                    title={visivel ? "Ocultar senha" : "Mostrar senha"}
                >
                    {visivel ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
        </div>
    );
}