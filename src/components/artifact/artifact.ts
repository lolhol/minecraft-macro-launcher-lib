
import { MOJANG } from '../../constants';
import { join } from 'path';

export interface IArtifact {
    path: string;
    url: string;
    size: number;
    sha1?: string;
}

export class Artifact implements IArtifact {

    static from(
        artifact: string | Partial<IArtifact>,
        parent: Partial<IArtifact> = {},
    ): Artifact {
        if (artifact instanceof Artifact) return artifact;

        switch (typeof artifact) {
            case 'string': return Artifact.fromId(artifact);
            case 'object': {
                const {
                    path = parent.path,
                    url = parent.url,
                    size = parent.size,
                    sha1 = parent.sha1,
                } = artifact;

                const errMsg = (param: string) => `missing artifact ${param}`;

                if (!path) throw new Error(errMsg('path'));
                if (!url) throw new Error(errMsg('url'));

                return new Artifact(
                    path,
                    url,
                    size,
                    sha1,
                );
            }
        }
    }

    /**
     * Transform artifact id to artifact instance.
     * @param id The artifact id. It should look like `<group>:<artifact>:<version>`, e.g. `com.mojang:patchy:1.1`.
     * @param defaultExtension The default extension. It should look like `jar`, `tar.xz` or other.
     * @param repoURL e.g. `https://libraries.mojang.com`.
     */
    static fromId(id: string, defaultExtension: string = 'jar', repoURL: string = MOJANG.LIBS_REPO): Artifact {
        const parts = id.split(':');

        if (parts.length < 3) throw new Error('passed string is not include a valid artifact id');

        const [group, artifact, unsplittedVersion] = parts;
        const [version, versionExtension = defaultExtension] = unsplittedVersion.split('@');
        const paths: string[] = [...group.split('.'), artifact, version];

        if (parts.length > 3) {
            const [unsplittedClassifier] = parts.slice(3);
            const [classifier, classifierExtension = defaultExtension] = unsplittedClassifier.split('@');
            paths.push(`${artifact}-${version}-${classifier}.${classifierExtension}`);
        } else {
            paths.push(`${artifact}-${version}.${versionExtension}`);
        }

        return new Artifact(join(...paths), repoURL + '/' + paths.join('/'));
    }

    constructor(
        public path: string,
        public url: string,
        public size: number = 0,
        public sha1?: string,
    ) { }

    /**
     * Transform this artifact to string representation.
     * @returns The artifact id. It should look like `<group>:<artifact>:<version>@<extension>`, e.g. `com.mojang:patchy:1.1@jar`.
     */
    toString(defaultExtension = 'jar'): string {
        const parts: string[] = this.path.split('/').reverse();
        const target = parts.shift();
        const version = parts.shift();
        const artifact = parts.shift();
        const group = parts.reverse().join('.');

        if (!target || !version || !artifact) throw new Error('artifact path parse error');

        const targetSep = '-';
        const splittedTarget = target.split(targetSep);

        const i = splittedTarget.indexOf(version);
        const ext = (i >= 1) ? splittedTarget.slice(i + 1).join(targetSep) : (splittedTarget.reverse().shift()?.replace(version, '') || defaultExtension);

        const extSep = '.';
        const idSep = ':';

        if (ext.startsWith(extSep)) return [group, artifact, version].join(idSep) + '@' + ext.replace(extSep, '');

        const splittedExtension = ext.split(extSep);
        const classifier = splittedExtension.shift();
        return [group, artifact, version, classifier].join(idSep) + '@' + splittedExtension.join(extSep);
    }

}
