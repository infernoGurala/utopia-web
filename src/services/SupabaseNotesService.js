import { getSupabase } from './supabase';

export class SupabaseNotesService {
  /**
   * Get personal root folders
   */
  static async getFolders() {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('folders')
      .select('name, path, is_hidden, sort_index')
      .eq('scope', 'legacy')
      .is('parent_path', null)
      .order('sort_index', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  }

  /**
   * Get files in a personal folder
   * @param {string} folderPath 
   */
  static async getFiles(folderPath) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('notes')
      .select('name, path, updated_at')
      .eq('folder_path', folderPath)
      .eq('scope', 'legacy')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Get content of a specific personal note
   * @param {string} path 
   */
  static async getNoteContent(path) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('notes')
      .select('content')
      .eq('path', path)
      .maybeSingle();

    if (error) throw error;
    return data?.content || '';
  }
}
