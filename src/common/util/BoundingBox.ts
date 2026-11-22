import {
	type Attachment,
	type Spine,
	type SpineBoundsProvider,
	VertexAttachment
} from "@esotericsoftware/spine-pixi-v8";
import { type Container, Polygon, Rectangle } from "pixi.js";

export type SizeHaver = {
	height: number;
	width: number;
};

export type RectangleLike = SizeHaver & {
	x: number;
	y: number;
};

type ScaledRectangleLike = RectangleLike & {
	scale: {
		x: number;
		y: number;
	};
};

/*#__PURE__*/
export function getBoundingBoxShapeFromSpine(spine: Spine, boundingBoxName = "BOUNDING_BOX"): Rectangle | Polygon {
	let attachment: Attachment | null | undefined;
	try {
		attachment = spine.skeleton.getAttachmentByName(boundingBoxName, boundingBoxName);
	} catch {
		// Missing slot/attachment — fall through to the default box below.
	}

	if (!attachment) {
		return new Rectangle(
			spine.skeleton.data.x,
			spine.skeleton.data.y,
			spine.skeleton.data.width,
			spine.skeleton.data.height
		);
	}

	if (!(attachment instanceof VertexAttachment)) {
		throw new Error(`The skeleton's ${boundingBoxName} attachment is malformed. Missing vertices.`);
	}
	return new Polygon(
		// Flip the Y component
		Array.from(attachment.vertices, (e, index) => (index % 2 === 0 ? e : -e))
	);
}

/*#__PURE__*/
export function getScaleToFitSourceInsideDestination(source: SizeHaver, destination: SizeHaver): number {
	return Math.min(destination.width / source.width, destination.height / source.height);
}

/*#__PURE__*/
export function getScaleToCoverDestinationWithSource(source: SizeHaver, destination: SizeHaver): number {
	return Math.max(destination.width / source.width, destination.height / source.height);
}

/*#__PURE__*/
export function getRectangleWithScaleApplied(rect: ScaledRectangleLike): Rectangle {
	return new Rectangle(rect.x, rect.y, rect.width * rect.scale.x, rect.height * rect.scale.y);
}

/*#__PURE__*/
export function scaleRectangleAndPosition(rect: RectangleLike, scale: number, to = new Rectangle()): Rectangle {
	to.x = rect.x * scale;
	to.y = rect.y * scale;
	to.width = rect.width * scale;
	to.height = rect.height * scale;

	return to;
}

/*#__PURE__*/
export function scaleSizeHaver(sizeHaver: SizeHaver, scale: number): SizeHaver {
	return {
		width: sizeHaver.width * scale,
		height: sizeHaver.height * scale
	};
}

/*#__PURE__*/
export function getLayoutBounds(container: Container): Rectangle {
	const localBounds = container.getLocalBounds();
	return new Rectangle(0, 0, localBounds.width + localBounds.x, localBounds.height + localBounds.y);
}

/*#__PURE__*/
export function boundsProviderFromSkeletonData(): SpineBoundsProvider {
	return {
		calculateBounds: ({
			skeleton: {
				data: { x, y, width, height }
			}
		}) => ({ x, y, width, height })
	};
}

/*#__PURE__*/
export function boundsProviderFromBoundingBox(boundingBoxName = "BOUNDING_BOX"): SpineBoundsProvider {
	return {
		calculateBounds: (
			spine: Spine
		): {
			x: number;
			y: number;
			width: number;
			height: number;
		} => getBoundingBoxShapeFromSpine(spine, boundingBoxName).getBounds()
	};
}
