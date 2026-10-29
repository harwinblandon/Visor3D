import { Group, type Object3D } from "three";

/**
 * Ref compatible with drei's <Html occlude={[...]}>, shared by all measurement overlays so
 * their labels hide when the model itself blocks the line of sight (e.g. after turning the
 * model around), instead of always floating on top of everything.
 *
 * Starts pointed at an empty, inert Group (never null) so raycasting against it is always
 * safe even before the real model has finished loading.
 */
export const modelOcclusionRef: { current: Object3D } = { current: new Group() };
