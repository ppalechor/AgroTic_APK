import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { listTratamientos, createTratamiento, updateTratamiento, deleteTratamiento, listEpas } from '../../services/api';
import TratamientoFormModal from '../../components/molecules/TratamientoFormModal';
import TratamientoDetailModal from '../../components/molecules/TratamientoDetailModal';
import TreatmentCard from '../../components/molecules/TreatmentCard';
import { useNavigation } from '@react-navigation/native';

export default function TratamientosPage() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [epas, setEpas] = useState([]);
  const [error, setError] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [current, setCurrent] = useState(null);

  const fetchData = async () => {
    setError('');
    try {
      const arr = await listTratamientos(token, { q: query });
      setItems(arr);
    } catch (e) {
      setError(e?.message || 'Error obteniendo tratamientos');
    }
  };

  const fetchEpas = async () => {
    try { const arr = await listEpas(token); setEpas(arr); } catch {}
  };

  useEffect(() => { if (!token) { setError('Sesión expirada.'); navigation.replace('App'); return; } fetchData(); fetchEpas(); }, [token]);
  useEffect(() => { const id = setTimeout(fetchData, 400); return () => clearTimeout(id); }, [query]);

  const groups = items.reduce((acc, it) => {
    const key = (() => {
      const e = it.epa_nombre ?? it.id_epa;
      if (e && typeof e === 'object') return e.nombre_epa ?? e.nombre ?? e.name ?? `EPA ${e.id_epa ?? e.id ?? ''}`;
      return e || `EPA ${it.id_epa}`;
    })();
    if (!acc[key]) acc[key] = [];
    acc[key].push(it);
    return acc;
  }, {});

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Tratamientos</Text>
        <Pressable style={styles.newBtn} onPress={() => { setCurrent(null); setOpenForm(true); }}><Feather name="plus" size={16} color="#fff" /><Text style={styles.newBtnText}> Nuevo</Text></Pressable>
      </View>
      <View style={styles.searchBox}>
        <Feather name="search" size={16} color="#64748b" />
        <TextInput style={styles.searchInput} placeholder="Buscar por descripción..." value={query} onChangeText={setQuery} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {Object.keys(groups).map((epaName) => (
          <View key={epaName} style={styles.group}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{epaName}</Text>
              <Text style={styles.groupCount}>{groups[epaName].length} tratamiento{groups[epaName].length === 1 ? '' : 's'}</Text>
            </View>
            {groups[epaName].map((item) => (
              <TreatmentCard
                key={String(item.id_tratamiento || item.id)}
                item={item}
                onInfo={() => { setCurrent(item); setOpenDetail(true); }}
                onEdit={() => { setCurrent(item); setOpenForm(true); }}
                onDelete={async () => { try { await deleteTratamiento(item.id_tratamiento || item.id, token); fetchData(); } catch (e) { setError(e?.message || 'Error eliminando'); } }}
              />
            ))}
          </View>
        ))}
      </ScrollView>
      <TratamientoFormModal
        visible={openForm}
        tratamiento={current}
        epas={epas}
        onClose={() => setOpenForm(false)}
        onSubmit={async (payload) => {
          if (!token) throw new Error('No autenticado');
          if (current) await updateTratamiento(current.id_tratamiento || current.id, payload, token);
          else await createTratamiento(payload, token);
          fetchData();
        }}
      />
      <TratamientoDetailModal visible={openDetail} tratamiento={current} onClose={() => { setOpenDetail(false); setCurrent(null); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', padding: 12 },
  scrollContent: { paddingBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#16A34A' },
  newBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#22C55E', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  newBtnText: { color: '#fff', fontSize: 13 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginVertical: 8 },
  searchInput: { marginLeft: 8, fontSize: 14, flex: 1 },
  group: { marginVertical: 10, backgroundColor: '#fff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E4E7EC' },
  groupTitle: { fontSize: 16, fontWeight: '700', color: '#16A34A' },
  groupCount: { fontSize: 12, color: '#475467' },
  error: { marginBottom: 8, color: '#DC2626' },
});
