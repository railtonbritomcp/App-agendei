import React, { useState } from 'react';
import { UF, Municipality, Neighborhood, Leader, Supporter } from '../types';
import { MapPin, ChevronRight, Users, Target, Building2, Globe } from 'lucide-react';

interface TerritoriesViewProps {
  ufs: UF[];
  municipalities: Municipality[];
  neighborhoods: Neighborhood[];
  leaders: Leader[];
  supporters: Supporter[];
}

export const TerritoriesView: React.FC<TerritoriesViewProps> = ({
  ufs,
  municipalities,
  neighborhoods,
  leaders,
  supporters
}) => {
  const [selectedUfId, setSelectedUfId] = useState<string>(ufs[0]?.code || 'SP');
  const [selectedMunId, setSelectedMunId] = useState<string>(municipalities[0]?.id || '');

  const currentUfMunicipalities = municipalities.filter(m => m.ufId === selectedUfId.toLowerCase() || m.ufId === selectedUfId);
  const currentMunNeighborhoods = neighborhoods.filter(n => n.municipalityId === selectedMunId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-[10px] font-bold uppercase tracking-widest">
            Cascata Territorial
          </span>
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Explorador de Territórios (UF ➔ Município ➔ Bairro)</h2>
        <p className="text-xs text-slate-400 mt-1">
          Navegue pela hierarquia geográfica da campanha para inspecionar metas macro e micro por região.
        </p>
      </div>

      {/* UF Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        {ufs.map(uf => {
          const isSelected = selectedUfId === uf.code;
          return (
            <button
              key={uf.id}
              onClick={() => {
                setSelectedUfId(uf.code);
                const firstMun = municipalities.find(m => m.ufId === uf.code.toLowerCase() || m.ufId === uf.code);
                if (firstMun) setSelectedMunId(firstMun.id);
              }}
              className={`px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                isSelected 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Globe size={16} />
              {uf.name} ({uf.code})
            </button>
          );
        })}
      </div>

      {/* Municipalities & Neighborhoods Drilldown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Municipalities List */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 mb-4 flex items-center gap-2">
            <Building2 size={16} />
            Municípios em {selectedUfId}
          </h3>

          <div className="space-y-3">
            {currentUfMunicipalities.map(mun => {
              const isMunSelected = selectedMunId === mun.id;
              const munLeaders = leaders.filter(l => l.municipalityId === mun.id);
              const munSupporters = supporters.filter(s => s.municipalityId === mun.id);
              const macroSum = munLeaders.reduce((acc, l) => acc + l.macroGoal, 0);
              const microSum = munSupporters.reduce((acc, s) => acc + s.microGoal, 0);

              return (
                <div
                  key={mun.id}
                  onClick={() => setSelectedMunId(mun.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isMunSelected 
                      ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md' 
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-white text-base">{mun.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {munLeaders.length} lideranças • {munSupporters.length} apoiadores
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-indigo-300">Macro: {macroSum}</p>
                    <p className="text-xs font-bold text-emerald-400">Micro: {microSum}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Neighborhoods Drilldown */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-4 flex items-center gap-2">
            <MapPin size={16} />
            Bairros do Município Selecionado
          </h3>

          <div className="space-y-3">
            {currentMunNeighborhoods.map(nei => {
              const neiLeaders = leaders.filter(l => l.neighborhoodId === nei.id);
              const neiSupporters = supporters.filter(s => s.neighborhoodId === nei.id);
              const macroSum = neiLeaders.reduce((acc, l) => acc + l.macroGoal, 0);
              const microSum = neiSupporters.reduce((acc, s) => acc + s.microGoal, 0);

              return (
                <div
                  key={nei.id}
                  className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-white text-sm">{nei.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {neiLeaders.length} lideranças • {neiSupporters.length} apoiadores
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-indigo-300">Macro: {macroSum}</p>
                    <p className="text-xs font-bold text-emerald-400">Micro: {microSum}</p>
                  </div>
                </div>
              );
            })}
            {currentMunNeighborhoods.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-xs">
                Nenhum bairro cadastrado para este município.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
