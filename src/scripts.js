class GitAPI {
    get head() {
        return this.currentBranch || this.branches.get('master') || this.git;
    }

    get listBranches() {
        return [...this.branches.keys()];
    }

    constructor($container, $select, $merge) {
        this.$container = $container;
        this.$select = $select;
        this.$merge = $merge;
        this.git = GitgraphJS.createGitgraph($container, {
            template: 'metro',
            // mode: 'compact',
            orientation: 'vertical',
            reverseArrow: false,
        });
        this.branches = new Map();
        this.lastTag = '';
        this.currentBranch = null;
        this.currentMerge = null;

        const master = this.createBranch('master');
        this.commit(master.name, 'Initial commit');
        this.tag();

        this.$select.addEventListener('change', (event) => {
            const name = event.target.value;
            const branch = this.branches.get(name);
            this.setCurrentBranch(branch);
        });
        this.$merge.addEventListener('change', (event) => {
            const name = event.target.value;
            const branch = this.branches.get(name);
            this.setCurrentMerge(branch);
        });

        window.gitApi = this;
    }

    commit(name, msg) {
        const randomMsg = `Random commit message ${Math.random().toString().slice(2)}`;
        const branch = (this.branches.get(name) || this.head);
        branch.commit(msg || randomMsg);

        console.log('commit to BRANCH:', branch.name, 'with MESSAGE:', msg || randomMsg);
    }

    createBranch(name, from) {
        const randomName = `feature-${Math.random().toString().slice(2)}`;
        const branch = from
            ? this.branches.get(from).branch(name || randomName)
            : this.head.branch(name || randomName);
        this.branches.set(name || randomName, branch);
        console.log('create BRANCH:', branch.name);
        this.createSelectOption(branch.name);
        this.setCurrentBranch(branch);

        return branch;
    }

    merge(to, from) {
        const targetBranch = this.branches.get(from) || this.currentBranch;
        const baseBranch = this.branches.get(to) || this.currentMerge;

        if (!baseBranch) {
            console.log('Select BRANCH where do you want to merge');
            return;
        }

        baseBranch.merge(targetBranch);
        this.setCurrentBranch(baseBranch);
        this.delete(targetBranch);
    }

    tag(rc = false) {
        const version = this.lastTag;

        if (!version) {
            this.head.tag('v1.0.0');
            this.lastTag = 'v1.0.0';
            return;
        }

        const matched = version.match(/(\d+)-rc\.(\d+)/i);

        if (!matched) {
            if (rc) {
                const currAsArray = version.split('.');
                const nextNumber = Number(currAsArray.slice(-1)) + 1;
                const newName = `v1.0.${nextNumber}-rc.0`;
                this.head.tag(newName);
                this.lastTag = newName;
                return;
            }

            const currAsArray = version.split('.');
            const nextNumber = Number(currAsArray.slice(-1)) + 1;
            const newName = `v1.0.${nextNumber}`;
            this.head.tag(newName);
            this.lastTag = newName;
            return;
        }

        const [, baseVersion, rcVersion] = matched;
        const nextRcVersion = Number(rcVersion) + 1 || 0;

        const newName = rc
            ? `v1.0.${baseVersion}-rc.${nextRcVersion}`
            : `v1.0.${baseVersion}`;
        this.head.tag(newName);
        this.lastTag = newName;
    }

    delete(branch) {
        this.branches.delete(branch.name);
        this.removeSelectOption(branch.name);
        branch.delete();
    }

    createSelectOption(name) {
        const $sOption = document.createElement('option');
        $sOption.innerText = name;
        $sOption.value = name;
        this.$select.append($sOption);

        const $mOption = document.createElement('option');
        $mOption.innerText = name;
        $mOption.value = name;
        this.$merge.append($mOption);
    }

    removeSelectOption(name) {
        this.$select.childNodes.forEach((option, i) => {
            if (option.value === name) {
                option.remove();
            }
        });
        this.$merge.childNodes.forEach((option, i) => {
            if (option.value === name) {
                option.remove();
            }
        });
    }

    setCurrentBranch(branch) {
        const currentName = this.currentBranch && this.currentBranch.name;
        this.$select.childNodes.forEach((option, i) => {
            option.selected = branch.name === option.value;
            this.$merge.options[i+1].disabled = branch.name === option.value

            if (option.selected) {
                console.log('Switch BRANCH from:', currentName, 'to:', option.innerText);
            }
        });
        this.currentBranch = branch;
    }

    setCurrentMerge(branch) {
        this.$merge.childNodes.forEach((option) => {
            option.selected = branch.name === option.value;
        });
        this.currentMerge = branch;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const $commitButton = document.getElementById('btn-commit');
    const $selectBranch = document.getElementById('select-branch');
    const $newBranchButton = document.getElementById('btn-new-branch');
    const $mergeButton = document.getElementById('btn-merge');
    const $tagButton = document.getElementById('btn-tag');
    const $tagRcButton = document.getElementById('btn-tag-rc');
    const $selectMerge = document.getElementById('select-merge');
    const graphContainer = document.getElementById('graph-container');

    const gitApi = new GitAPI(graphContainer, $selectBranch, $selectMerge);

    $commitButton.addEventListener('click', () => {
        gitApi.commit();
    });

    $newBranchButton.addEventListener('click', () => {
        gitApi.createBranch();
    });

    $tagButton.addEventListener('click', () => {
        gitApi.tag();
    });

    $tagRcButton.addEventListener('click', () => {
        gitApi.tag(true);
    });

    $mergeButton.addEventListener('click', () => {
        gitApi.merge();
    })
});
