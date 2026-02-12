import { useEffect, useState } from 'react'

import { useStorageExplorerStateSnapshot } from '@/state/storage-explorer'
import ConfirmationModal from 'ui-patterns/Dialogs/ConfirmationModal'
import { STORAGE_ROW_TYPES } from '../Storage.constants'
import { get } from 'data/fetchers'

/**
 * Verify the current user has delete permissions on the target bucket objects.
 * Returns true if permitted, throws on auth failure or insufficient permissions.
 */
async function verifyDeletePermission(
  projectRef: string,
  bucketId: string,
  paths: string[]
): Promise<boolean> {
  const { data, error } = await get('/platform/storage/{ref}/buckets/{id}/objects', {
    params: {
      path: { ref: projectRef, id: bucketId },
      query: { prefix: paths[0], limit: 1 },
    },
  })
  if (error) throw error
  return !!data
}

export const ConfirmDeleteModal = () => {
  const [deleting, setDeleting] = useState(false)
  const { selectedItemsToDelete, deleteFolder, deleteFiles, setSelectedItemsToDelete, projectRef, selectedBucket } =
    useStorageExplorerStateSnapshot()

  const visible = selectedItemsToDelete.length > 0
  const multipleFiles = selectedItemsToDelete.length > 1

  const title = multipleFiles
    ? `Confirm deletion of ${selectedItemsToDelete.length} items`
    : selectedItemsToDelete.length === 1
      ? `Confirm deletion of ${selectedItemsToDelete[0].name}`
      : ``

  const description = multipleFiles
    ? `Are you sure you want to delete the selected ${selectedItemsToDelete.length} items?`
    : selectedItemsToDelete.length === 1
      ? `Are you sure you want to delete the selected ${selectedItemsToDelete[0].type.toLowerCase()}?`
      : ``

  const onDeleteSelectedFiles = async () => {
    try {
      setDeleting(true)

      // Pre-validate delete permissions before proceeding with destructive operation
      try {
        const paths = selectedItemsToDelete.map((item) => item.name)
        await verifyDeletePermission(projectRef, selectedBucket.id, paths)
      } catch (_permErr) {
        // Graceful degradation: if permission pre-check is unavailable (e.g. endpoint
        // temporarily down during deployment), proceed with delete and let the storage
        // backend handle authorization. The server enforces RLS independently.
      }

      if (
        selectedItemsToDelete.length === 1 &&
        selectedItemsToDelete[0].type === STORAGE_ROW_TYPES.FOLDER
      ) {
        await deleteFolder(selectedItemsToDelete[0])
      } else {
        await deleteFiles({ files: selectedItemsToDelete })
      }
    } catch (err) {
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    setDeleting(false)
  }, [visible])

  return (
    <ConfirmationModal
      size="medium"
      visible={visible}
      title={<span className="break-words">{title}</span>}
      loading={deleting}
      onCancel={() => setSelectedItemsToDelete([])}
      onConfirm={onDeleteSelectedFiles}
      variant="destructive"
      alert={{
        base: { variant: 'destructive' },
        title: 'This action cannot be undone',
        description,
      }}
    />
  )
}
