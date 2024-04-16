'use server'

import dayjs from 'dayjs'
import { auth } from '@clerk/nextjs'
import weekday from 'dayjs/plugin/weekday'

import knex from 'lib/db'
import { ActionResponse, ISubscription } from 'types'

dayjs.extend(weekday)

export const user = async () => {
	const { userId } = auth()
	try {
		const data = await knex
			.select('id', 'first_name', ' last_name', 'email', 'auth_id')
			.from('user')
			.where('auth_id', userId)
			.first()
		return data
	} catch (error) {
		console.log(error)
	}
}

export const subscriptions_list = async (
	userId: string,
	interval: string = 'ALL'
): ActionResponse<ISubscription[]> => {
	try {
		const result = await knex
			.select(
				'id',
				'title',
				'website',
				'amount',
				'currency',
				'interval',
				'user_id',
				'service',
				'is_active',
				'next_billing_date',
				'payment_method_id'
			)
			.from('subscription')
			.where('user_id', userId)
			.andWhere(builder =>
				builder.whereIn(
					'interval',
					interval === 'ALL' ? ['MONTHLY', 'QUARTERLY', 'YEARLY'] : [interval]
				)
			)
			.orderBy('is_active', 'desc')
			.orderBy('next_billing_date', 'asc')
		return result
	} catch (error) {
		throw new Error('Failed to fetch the subscriptions')
	}
}

export const subscriptions_create = async (body: any) => {
	try {
		const result = await knex('subscription').returning('id').insert(body)

		return { status: 'SUCCESS', data: result }
	} catch (error) {
		return { status: 'ERROR', data: null }
	}
}

export const subscriptions_delete = async (id: string) => {
	try {
		const result = await knex('subscription').where('id', id).del(['id'])

		return { status: 'SUCCESS', data: result }
	} catch (error) {
		return { status: 'ERROR', data: null }
	}
}

export const subscriptions_analytics_weekly = async (user_id: string) => {
	try {
		const data = await knex('subscription')
			.select('currency')
			.count()
			.sum('amount')
			.groupBy('currency')
			.where('user_id', '=', user_id)
			.andWhere('is_active', '=', true)
			.andWhere('next_billing_date', '>', dayjs().weekday(0).format('YYYY-MM-DD'))
			.andWhere('next_billing_date', '<=', dayjs().weekday(7).format('YYYY-MM-DD'))
		return data
	} catch (error) {
		throw new Error('Failed to fetch weekly subscriptions data.')
	}
}

export const subscriptions_analytics_top_five_most_expensive = async (user_id: string) => {
	try {
		const data = await knex
			.with(
				'active_subscriptions',
				knex.raw(
					`SELECT amount, interval, currency, title FROM subscription WHERE user_id = ? AND is_active = true`,
					user_id
				)
			)
			.select(
				'title',
				'currency',
				'interval',
				knex.raw(
					`CASE WHEN interval = 'MONTHLY' THEN amount * 12 WHEN interval = 'QUARTERLY' THEN amount * 4 ELSE amount END AS amount`
				)
			)
			.from('active_subscriptions')
			.orderBy('amount', 'desc')

		const transformed = data.reduce((acc, curr) => {
			if (!(curr.currency in acc)) {
				acc[curr.currency] = [curr]
			} else {
				acc[curr.currency].push(curr)
			}
			return acc
		}, {})

		return transformed
	} catch (error) {
		throw new Error('Failed to fetch top five most expensive subscriptions.')
	}
}

export const services = async () => {
	try {
		const data = await knex
			.select('id', 'key', ' title', 'website')
			.from('service')
			.orderBy('title', 'asc')
		return data
	} catch (error) {
		console.log(error)
	}
}
