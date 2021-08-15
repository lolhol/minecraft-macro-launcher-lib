
export interface IAuthResponse {
    accessToken: string              // hexadecimal
    clientToken: string              // identical to one received
    availableProfiles: IProfile[]
    selectedProfile: IProfile        // only present if agent field was received
    user?: IUser                     // only present if requestUser was true in request payload
}

export interface IProfile {
    id: string                       // hexadecimal (uuid without dashes)
    name: string                     // nickname
    userId?: string                  // hex string
    createdAt?: number
    legacyProfile?: boolean
    suspended?: boolean
    paid?: boolean
    migrated?: boolean
    legacy?: boolean                 // in practice, this field only appears in response if true (default to false)
}

interface IUser {
    id: string                       // hexadecimal
    email: string                    // hashed(?) value for unmigrated accounts
    username: string                 // regular name for unmigrated accounts, email for migrated ones
    registerIp: string               // IP address with last digit censored
    migratedFrom: string
    migratedAt: number
    registeredAt: number             // may be a few minutes earlier than createdAt for profile
    passwordChangedAt: number
    dateOfBirth: number
    suspended: boolean
    blocked: boolean
    secured: boolean
    migrated: boolean                // seems to be false even when migratedAt and migratedFrom are present..
    emailVerified: boolean
    legacyUser: boolean
    verifiedByParent: boolean
    properties: UserProperties
}

export type UserProperties = {
    [prop: number]: { name: string, value: string }
}

export interface IAuthException {
    error: string
    errorMessage: string
}

export interface IAuthEndpoints {
    base: string
    readonly _authenticate: string
    readonly _refresh: string
    readonly _validate: string
    readonly _invalidate: string
    readonly _signout: string
}

import axios, {
    AxiosPromise,
    // AxiosError,
    AxiosResponse,
} from 'axios'

import * as uuid from 'uuid'

import {
    urls,
} from '../../constants'

export class Authenticator {

    /**
     * Random generate a new token by UUID v4.
     * @returns a new token.
     */
    static newToken = () => uuid.v4().replace(/-/g, '')

    /**
     * Create a new default auth response.
     */
    static default(name: string): IAuthResponse {
        const _profile: IProfile = {
            name,
            id: Authenticator.newToken(),
        }

        return {
            accessToken: Authenticator.newToken(),
            clientToken: Authenticator.newToken(),
            selectedProfile: _profile,
            availableProfiles: [
                _profile,
            ],
        }
    }

    /**
     * Authenticate a user with their Mojang credentials.
     *
     * @param username a username or email address of Mojang account.
     * @param clientToken a launcher's token.
     * @param requestUser Adds user object to response (optional).
     * @param url of auth API (default: authserver.mojang.com/authenticate).
     *
     * @see http://wiki.vg/Authentication#Authenticate
     *
     * @throws This may throw the error object with type AxiosError<IAuthException>.
     */
    static authenticate(username: string, password: string, clientToken: string, requestUser = false, url = `${urls.DEFAULT_AUTH}/authenticate`): AxiosPromise<IAuthResponse> {
        return axios({
            method: 'POST',
            url,
            data: {
                clientToken,
                requestUser,
                username,
                password,
                agent: { name: 'minecraft', version: 1 },
            }
        })
    }

    /**
     * Refresh a user's authentication.
     * This should be used to keep a user logged in without asking them for their credentials again.
     * A new access token will be generated using a recent invalid access token.
     *
     * @param accessToken a old access token.
     * @param clientToken a launcher's client token.
     * @param requestUser Adds user object to reponse (optional).
     * @param url of auth API (default: authserver.mojang.com/refresh).
     *
     * @throws This may throw the error object with type AxiosError<IAuthException>.
     *
     * @see http://wiki.vg/Authentication#Refresh
     */
    static refresh(
        accessToken: string,
        clientToken: string,
        requestUser = true,
        url = `${urls.DEFAULT_AUTH}/refresh`,
    ): AxiosPromise<IAuthResponse> {
        return axios({
            method: 'POST',
            url,
            data: {
                accessToken,
                clientToken,
                requestUser,
            },
        })
    }

    /**
     * Делает недействительными токен доступа, используя имя пользователя и пароль.
     *
     * @param username a username or this is often an email of Mojang account.
     * @param url of auth API (default: authserver.mojang.com/signout).
     *
     * @throws This may throw the error object with type AxiosError<IAuthException>.
     */
    static signout(
        username: string,
        password: string,
        url = `${urls.DEFAULT_AUTH}/signout`,
    ): Promise<boolean> {
        return Authenticator.query({
            username,
            password,
        }, url)
    }

    /**
     * Validate an access token.
     * This should always be done before launching.
     * The client token should match the one used to create the access token.
     *
     * @param accessToken a access token from auth response.
     * @param clientToken a launcher's client token.
     * @param url of auth API (default: authserver.mojang.com/validate).
     *
     * @see http://wiki.vg/Authentication#Validate
     */
    static validate(
        accessToken: string,
        clientToken: string,
        url = `${urls.DEFAULT_AUTH}/validate`,
    ): Promise<boolean> {
        return Authenticator.query({
            accessToken,
            clientToken,
        }, url)
    }

    /**
     * Invalidate an access token.
     * The client token must match the token used to create the provided access token.
     *
     * @param accessToken The access token.
     * @param clientToken The launcher's client token.
     * @param url of auth API (default: authserver.mojang.com/invalidate).
     *
     * @see http://wiki.vg/Authentication#Invalidate
     */
    static invalidate(
        accessToken: string,
        clientToken: string,
        url = `${urls.DEFAULT_AUTH}/invalidate`,
    ): Promise<boolean> {
        return Authenticator.query({
            accessToken,
            clientToken,
        }, url)
    }

    private static query(payload: { [prop: string]: string }, url: string): Promise<boolean> {
        return axios({
            method: 'POST',
            url,
            data: {
                ...payload,
            },
        })
        .then(({ status }) => {
            switch (status) {
                case 204: break
                default: {
                    return (false)
                }
            }

            return true
        })
        .catch(() => (false))
    }

    constructor(
        readonly clientToken: string,
        private readonly endpoints: IAuthEndpoints,
    ) { }

    authenticate(username: string, password: string, requestUser = false) {
        return Authenticator.authenticate(username, password, this.clientToken, requestUser, this.endpoints.base + this.endpoints._authenticate)
    }

    refresh(accessToken: string, requestUser = false) {
        return Authenticator.refresh(accessToken, this.clientToken, requestUser, this.endpoints.base + this.endpoints._refresh)
    }

    signout(username: string, password: string) {
        return Authenticator.signout(username, password, this.endpoints.base + this.endpoints._signout)
    }

    validate(accessToken: string) {
        return Authenticator.validate(accessToken, this.clientToken, this.endpoints.base + this.endpoints._validate)
    }

    invalidate(accessToken: string) {
        return Authenticator.invalidate(accessToken, this.clientToken, this.endpoints.base + this.endpoints._invalidate)
    }

}
