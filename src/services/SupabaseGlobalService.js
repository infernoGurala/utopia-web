import { getSupabase } from './supabase';

export class SupabaseGlobalService {
  /**
   * Get all university root folders
   */
  static async getUniversities() {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('folders')
      .select('path')
      .eq('scope', 'university')
      .or('is_hidden.eq.false,is_hidden.is.null');

    if (error) throw error;
    
    // Deduce root university names from all paths and return as folder items
    const rootPaths = [...new Set(data.map(row => row.path.split('/')[0]))];
    return rootPaths.filter(Boolean).map(name => ({
      name,
      path: name,
      type: 'dir'
    }));
  }

  /**
   * Get contents of a specific community directory
   * @param {string} directoryPath 
   */
  static async getDirectoryContents(directoryPath) {
    const supabase = getSupabase();
    const cleanPath = (directoryPath || '').trim().replace(/\/+$/, '');
    
    let folderQuery = supabase
      .from('folders')
      .select('*')
      .eq('is_hidden', false)
      .order('sort_index', { ascending: true })
      .order('name', { ascending: true });

    let notesQuery = supabase
      .from('notes')
      .select('name, path, updated_at, sort_index')
      .order('sort_index', { ascending: true })
      .order('name', { ascending: true });

    if (!cleanPath) {
      folderQuery = folderQuery.is('parent_path', null);
      notesQuery = notesQuery.is('folder_path', null);
    } else {
      folderQuery = folderQuery.in('parent_path', [cleanPath, `${cleanPath}/`]);
      notesQuery = notesQuery.in('folder_path', [cleanPath, `${cleanPath}/`]);
    }

    const [foldersRes, notesRes] = await Promise.all([folderQuery, notesQuery]);

    if (foldersRes.error) throw foldersRes.error;
    if (notesRes.error) throw notesRes.error;

    const items = [
      ...(foldersRes.data || []).map(f => ({ ...f, type: 'dir' })),
      ...(notesRes.data || []).map(n => ({ ...n, type: 'file' }))
    ];

    return items;
  }

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

  static async getFolderIcons(pathPrefix) {
    const supabase = getSupabase();
    const cleanPath = (pathPrefix || '').trim().replace(/\/+$/, '');
    if (!cleanPath) return {};

    const { data, error } = await supabase
      .from('folder_icons')
      .select('folder_path, icon_key')
      .like('folder_path', `${cleanPath}%`);

    if (error) throw error;
    
    const icons = {};
    if (data) {
      data.forEach(item => {
        icons[item.folder_path] = item.icon_key;
      });
    }
    return icons;
  }

  static async createFolder(path, name, parentPath, createdBy, universityId = null, classId = null) {
    const supabase = getSupabase();
    const { error } = await supabase.from('folders').insert({
      path,
      name,
      parent_path: parentPath,
      scope: 'university',
      created_by: createdBy,
      university_id: universityId,
      class_id: classId,
      is_hidden: false
    });
    if (error) throw error;
  }

  static async createNote(path, name, folderPath, createdBy, universityId = null, classId = null) {
    const supabase = getSupabase();
    const { error } = await supabase.from('notes').insert({
      path,
      name,
      folder_path: folderPath,
      content: '',
      scope: 'university',
      created_by: createdBy,
      updated_by: createdBy,
      university_id: universityId,
      class_id: classId
    });
    if (error) throw error;
  }

  static async deleteNote(path) {
    const supabase = getSupabase();
    const { error } = await supabase.from('notes').delete().eq('path', path);
    if (error) throw error;
  }

  static async deleteFolder(path) {
    const supabase = getSupabase();
    // Simplified: would normally need to cascade delete subfolders/notes or rely on Supabase cascading FKs
    await supabase.from('notes').delete().like('folder_path', `${path}%`);
    await supabase.from('folders').delete().like('path', `${path}%`);
    const { error } = await supabase.from('folders').delete().eq('path', path);
    if (error) throw error;
  }

  static async renameNote(path, newName, newPath) {
    const supabase = getSupabase();
    const { error } = await supabase.from('notes').update({ name: newName, path: newPath }).eq('path', path);
    if (error) throw error;
  }

  static async updateNoteContent(path, content, updatedBy) {
    const supabase = getSupabase();
    // In Flutter we also created a note_versions snapshot. Simple version for web:
    const { error } = await supabase.from('notes').update({ content, updated_by: updatedBy }).eq('path', path);
    if (error) throw error;
  }

  static async setFolderIcon(folderPath, iconKey) {
    const supabase = getSupabase();
    const { error } = await supabase.from('folder_icons').upsert({ folder_path: folderPath, icon_key: iconKey });
    if (error) throw error;
  }

  static async updateSortOrder(table, path, newSortIndex) {
    const supabase = getSupabase();
    const { error } = await supabase.from(table).update({ sort_index: newSortIndex }).eq('path', path);
    if (error) throw error;
  }

  // ─── Trash (soft-delete) support ───

  static async hideNote(path) {
    const supabase = getSupabase();
    const { error } = await supabase.from('notes').update({ is_hidden: true }).eq('path', path);
    if (error) throw error;
  }

  static async unhideNote(path) {
    const supabase = getSupabase();
    const { error } = await supabase.from('notes').update({ is_hidden: false }).eq('path', path);
    if (error) throw error;
  }

  static async hideFolder(path) {
    const supabase = getSupabase();
    const { error } = await supabase.from('folders').update({ is_hidden: true }).eq('path', path);
    if (error) throw error;
  }

  static async unhideFolder(path) {
    const supabase = getSupabase();
    const { error } = await supabase.from('folders').update({ is_hidden: false }).eq('path', path);
    if (error) throw error;
  }
}
