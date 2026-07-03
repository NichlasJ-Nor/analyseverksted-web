import { supabase } from './supabase';

export interface AnalysisRow {
  id: string;
  name: string;
  tool: string;
  state: unknown;
  updated_at: string;
}

export async function listAnalyses(tool: string): Promise<AnalysisRow[]> {
  const { data, error } = await supabase
    .from('analyses')
    .select('id, name, tool, state, updated_at')
    .eq('tool', tool)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveAnalysis(
  id: string | null,
  name: string,
  tool: string,
  state: unknown
): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const owner = userData.user?.id;
  if (!owner) throw new Error('Ikke innlogget.');

  if (id) {
    const { error } = await supabase.from('analyses').update({ name, state }).eq('id', id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase
    .from('analyses')
    .insert({ owner, name, tool, state })
    .select('id')
    .single();
  if (error) throw error;
  await supabase.from('analysis_log').insert({
    analysis_id: data.id, owner, action: 'Opprettet', details: name,
  });
  return data.id;
}

export async function deleteAnalysis(id: string): Promise<void> {
  const { error } = await supabase.from('analyses').delete().eq('id', id);
  if (error) throw error;
}
