import { IMessage, IRoom } from '@rocket.chat/core-typings';
import { useMutableCallback } from '@rocket.chat/fuselage-hooks';
import { useSetting, useTranslation } from '@rocket.chat/ui-contexts';
import React, { ReactNode, useCallback, useMemo } from 'react';

import { Users } from '../../../../../app/models/client';
import { chatMessages, fileUpload } from '../../../../../app/ui/client';
import { useReactiveValue } from '../../../../hooks/useReactiveValue';
import { roomCoordinator } from '../../../../lib/rooms/roomCoordinator';
import { useDropTarget } from './useDropTarget';

export const useFileUploadDropTarget = (
	room: IRoom,
	tmid?: IMessage['_id'],
): readonly [
	fileUploadTriggerProps: {
		onDragEnter: (event: React.DragEvent<Element>) => void;
	},
	fileUploadOverlayProps: {
		visible: boolean;
		onDismiss: () => void;
		enabled: boolean;
		reason?: ReactNode;
	},
] => {
	const { triggerProps, overlayProps } = useDropTarget();

	const t = useTranslation();

	const fileUploadEnabled = useSetting('FileUpload_Enabled') as boolean;
	const fileUploadAllowedForUser = useReactiveValue(
		useCallback(
			() => !roomCoordinator.readOnly(room._id, Users.findOne({ _id: Meteor.userId() }, { fields: { username: 1 } })),
			[room._id],
		),
	);

	const onFileDrop = useMutableCallback(async (files: File[]) => {
		const { input } = chatMessages[room._id];
		if (!input) return;

		const { mime } = await import('../../../../../app/utils/lib/mimeTypes');

		const uploads = Array.from(files).map((file) => {
			Object.defineProperty(file, 'type', { value: mime.lookup(file.name) });
			return {
				file,
				name: file.name,
			};
		});

		fileUpload(uploads, input, { rid: room._id, tmid });
	});

	const allOverlayProps = useMemo(() => {
		if (!fileUploadEnabled) {
			return {
				enabled: false,
				reason: t('FileUpload_Disabled'),
				...overlayProps,
			} as const;
		}

		if (!fileUploadAllowedForUser) {
			return {
				enabled: false,
				reason: t('error-not-allowed'),
				...overlayProps,
			} as const;
		}

		return {
			enabled: true,
			onFileDrop,
			...overlayProps,
		} as const;
	}, [fileUploadAllowedForUser, fileUploadEnabled, onFileDrop, overlayProps, t]);

	return [triggerProps, allOverlayProps] as const;
};
