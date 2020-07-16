import {PlainObject} from 'core-helpers';

export type Query = SingleQuery | SingleQuery[];

export type SingleQuery = PlainObject | true;
