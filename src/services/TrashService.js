import { db, auth } from './firebase';
import { 
  collection, doc, addDoc, getDocs, getDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, Timestamp 
} from 'firebase/firestore';
import { SupabaseGlobalService } from './SupabaseGlobalService';

/**
 * TrashService — mirrors the Flutter TrashService.
 * 
 * Items moved to trash are stored in Firestore under:
 *   community_trash/{universityId}/items/{docId}
 *
 * Each trash document stores:
 *   - path: original file/folder path in the repo
 *   - name: display name
 *   - type: 'file' or 'dir'
 *   - deletedAt: server timestamp
 *   - deletedBy: uid of user who deleted
 *   - deletedByName: display name
 *   - permanentDeleteAt: timestamp 30 days from deletion
 *   - restored: boolean (set to true when restored)
 */
export class TrashService {
  constructor(universityId) {
    this.universityId = universityId;
    this._colPath = `community_trash/${universityId}/items`;
  }

  get _colRef() {
    return collection(db, this._colPath);
  }

  /**
   * Move an item to trash (soft delete).
   */
  async moveToTrash({ path, name, type }) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    // Check if already in trash
    const existing = query(this._colRef, where('path', '==', path), where('restored', '==', false));
    const snap = await getDocs(existing);
    if (!snap.empty) {
      console.log('TRASH: Item already in trash:', path);
      return;
    }

    const now = new Date();
    const permanentDeleteDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Hide the item in Supabase
    try {
      if (type === 'file') {
        await SupabaseGlobalService.hideNote(path);
      } else {
        await SupabaseGlobalService.hideFolder(path);
      }
    } catch (e) {
      console.warn('TRASH: Failed to hide in Supabase:', e);
    }

    await addDoc(this._colRef, {
      path,
      name,
      type,
      deletedAt: serverTimestamp(),
      deletedBy: user.uid,
      deletedByName: user.displayName || 'Unknown',
      permanentDeleteAt: Timestamp.fromDate(permanentDeleteDate),
      restored: false,
      universityId: this.universityId,
    });
  }

  /**
   * Get all trashed items (non-restored).
   */
  async getTrashItems() {
    const q = query(this._colRef, orderBy('deletedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(item => item.restored === false);
  }

  /**
   * Get all trashed paths (for filtering display).
   */
  async getTrashedPaths() {
    const q = query(this._colRef, where('restored', '==', false));
    const snap = await getDocs(q);
    return new Set(snap.docs.map(d => d.data().path));
  }

  /**
   * Restore an item from trash.
   */
  async restore(docId) {
    const docRef = doc(db, this._colPath, docId);
    
    // Get the document data to unhide in Supabase
    const docSnap = await getDoc(docRef);
    const data = docSnap.data();

    if (data) {
      try {
        if (data.type === 'file') {
          await SupabaseGlobalService.unhideNote(data.path);
        } else {
          await SupabaseGlobalService.unhideFolder(data.path);
        }
      } catch (e) {
        console.warn('TRASH: Failed to unhide:', e);
      }
    }

    await updateDoc(docRef, {
      restored: true,
      restoredAt: serverTimestamp(),
      restoredBy: auth.currentUser?.uid,
    });
  }

  /**
   * Permanently delete an item.
   */
  async permanentlyDelete(docId, path) {
    // Delete from Supabase
    try {
      if (path.endsWith('.md')) {
        await SupabaseGlobalService.deleteNote(path);
      } else {
        await SupabaseGlobalService.deleteFolder(path);
      }
    } catch (e) {
      console.warn('TRASH: Failed to delete from Supabase:', e);
    }

    // Remove from Firestore trash
    await deleteDoc(doc(db, this._colPath, docId));
  }

  /**
   * Get days remaining until permanent auto-deletion.
   */
  daysRemaining(permanentDeleteAt) {
    if (!permanentDeleteAt) return 30;
    const deadline = permanentDeleteAt.toDate ? permanentDeleteAt.toDate() : new Date(permanentDeleteAt);
    const remaining = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(30, remaining));
  }
}
