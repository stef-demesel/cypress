import _ from 'lodash'
import $dom from '../../dom'

export default function (Commands, Cypress, cy) {
  Commands.addQuery('as', function asFn (alias) {
    Cypress.ensure.isChildCommand(this, [alias], cy)
    cy.validateAlias(alias)

    const prevCommand = cy.state('current').get('prev')

    prevCommand.set('alias', alias)

    // Shallow clone of the existing subject chain, so that future commands running on the same chainer
    // don't apply here as well.
    const subjectChain = [...cy.subjectChain()]

    const fileName = prevCommand.get('fileName')

    cy.addAlias(cy.state('ctx'), { subjectChain, command: prevCommand, alias, fileName })

    // Only need to update the log messages of previous commands once.
    // Subsequent invocations can shortcut to just return the subject unchanged.
    let alreadyDone = false

    return (subject) => {
      if (alreadyDone) {
        return subject
      }

      alreadyDone = true

      // TODO: change the log type from `any` to `Log`.
      // we also need to set the alias on the last command log
      // that matches our chainerId
      const log: any = _.last(cy.queue.logs({
        instrument: 'command',
        event: false,
        chainerId: this.get('chainerId'),
      }))

      const alreadyAliasedLog = _.map(prevCommand.get('logs'), 'attributes.alias').find((a) => a === alias)

      if (!alreadyAliasedLog && log) {
        log.set({
          alias,
          aliasType: $dom.isElement(subject) ? 'dom' : 'primitive',
        })
      }

      return subject
    }
  })
}
