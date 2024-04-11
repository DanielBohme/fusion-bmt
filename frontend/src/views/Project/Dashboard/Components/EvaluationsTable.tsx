import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { Icon, Table, Tooltip, Typography } from '@equinor/eds-core-react'
import {
    warning_filled,
    check,
    radio_button_unselected,
    radio_button_selected,
    visibility_off,
    visibility
} from '@equinor/eds-icons'
import { tokens } from '@equinor/eds-tokens'

import { useProject } from '../../../../globals/contexts'
import { progressionToString } from '../../../../utils/EnumToString'
import { calcProgressionStatus, countProgressionStatus, ProgressionStatus } from '../../../../utils/ProgressionStatus'
import { sort, SortDirection } from '../../../../utils/sort'
import { Evaluation, Progression } from '../../../../api/models'
import { assignAnswerToBarrierQuestions } from '../../../Evaluation/FollowUp/util/helpers'
import { getEvaluationActionsByState } from '../../../../utils/actionUtils'
import Bowtie from '../../../../components/Bowtie/Bowtie'
import SortableTable, { Column } from '../../../../components/SortableTable'
import ProgressStatusIcon from './ProgressStatusIcon'
import { useModuleCurrentContext } from '@equinor/fusion-framework-react-module-context'

const { Row, Cell } = Table

const WARNING_COLOR = tokens.colors.interactive.danger__resting.rgba

const columns: Column[] = [
    { name: 'Title', accessor: 'name', sortable: true },
    { name: 'Workflow', accessor: 'progression', sortable: true },
    { name: 'Bowtie status', accessor: 'bowtie', sortable: false },
    { name: 'Overdue actions', accessor: 'overdue_actions', sortable: true },
    { name: 'Open actions', accessor: 'open_actions', sortable: true },
    { name: 'Closed actions', accessor: 'closed_actions', sortable: true },
    { name: 'Date created', accessor: 'createDate', sortable: true },
    { name: 'Active evaluation', accessor: 'indicator', sortable: false },
    { name: 'Select active evaluation', accessor: 'select', sortable: false },
    { name: 'Hide evaluation', accessor: 'hide', sortable: false },
]

const Centered = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
`

const CellWithBorder = styled(Cell)`
    border-right: 1px solid lightgrey;
`

interface Props {
    evaluations: Evaluation[]
}

const EvaluationsTable = ({ evaluations }: Props) => {
    const currentProject = useModuleCurrentContext()
    const [selectedEvaluation, setSelectedEvaluation] = React.useState<Evaluation | null>(null)
    const [hiddenEvaluations, setHiddenEvaluations] = React.useState<Evaluation[]>([])

    useEffect(() => {
        console.log("list of hidden evaluations changed: ", hiddenEvaluations)
    }, [hiddenEvaluations])

    useEffect(() => {
        console.log("selected evaluation changed: ", selectedEvaluation)
    }, [selectedEvaluation])

    if (currentProject === null || currentProject === undefined) {
        return <p>No project selected</p>
    }

    const sortOnAccessor = (a: Evaluation, b: Evaluation, accessor: string, sortDirection: SortDirection) => {
        switch (accessor) {
            case 'name': {
                return sort(a.name.toLowerCase(), b.name.toLowerCase(), sortDirection)
            }
            case 'progression': {
                const numCompletedA = countProgressionStatus(ProgressionStatus.Complete, a.progression)
                const numCompletedB = countProgressionStatus(ProgressionStatus.Complete, b.progression)
                return sort(numCompletedA, numCompletedB, sortDirection)
            }
            case 'overdue_actions': {
                const actionsByStateA = getEvaluationActionsByState(a)
                const actionsByStateB = getEvaluationActionsByState(b)
                return sort(actionsByStateA.overdueActions.length, actionsByStateB.overdueActions.length, sortDirection)
            }
            case 'open_actions': {
                const actionsByStateA = getEvaluationActionsByState(a)
                const actionsByStateB = getEvaluationActionsByState(b)
                return sort(actionsByStateA.openActions.length, actionsByStateB.openActions.length, sortDirection)
            }
            case 'closed_actions': {
                const actionsByStateA = getEvaluationActionsByState(a)
                const actionsByStateB = getEvaluationActionsByState(b)
                return sort(actionsByStateA.closedActions.length, actionsByStateB.closedActions.length, sortDirection)
            }
            case 'createDate': {
                return sort(a.createDate, b.createDate, sortDirection)
            }
            default:
                return sort(a.name, b.name, sortDirection)
        }
    }

    const renderRow = (evaluation: Evaluation, index: number) => {
        const isWorkshopOrLater =
            evaluation.progression === Progression.Workshop ||
            evaluation.progression === Progression.FollowUp ||
            evaluation.progression === Progression.Finished
        const showBowtieContent = evaluation.questions && isWorkshopOrLater
        const answersWithBarrier = showBowtieContent
            ? assignAnswerToBarrierQuestions(evaluation.questions, Progression.Finished ? Progression.FollowUp : evaluation.progression)
            : []
        const actionsByState = getEvaluationActionsByState(evaluation)

        const getLastCharacter = (str: string) => {
            return str.charAt(str.length - 1)
        }

        const getEvaluationLink = (location: any) => {
            if (location.pathname.includes('bmt/')) {
                if (getLastCharacter(location.pathname) === "/") {
                    return ({ ...location, pathname: `evaluation/${evaluation.id}` })
                }
                return ({ ...location, pathname: `${currentProject.currentContext?.id}/evaluation/${evaluation.id}` })
            }
            return ({ ...location, pathname: `/${currentProject.currentContext?.id}/evaluation/${evaluation.id}` })
        }

        return (
            <Row key={index}>
                <CellWithBorder>
                    <Link to={(location: any) => getEvaluationLink(location)} style={{ textDecoration: 'none' }}>
                        <Typography
                            color="primary"
                            variant="body_short"
                            token={{
                                fontSize: '1.2rem',
                            }}
                        >
                            {evaluation.name}
                        </Typography>
                    </Link>
                </CellWithBorder>
                <CellWithBorder>
                    <Centered>
                        {Object.values(Progression)
                            .filter(p => p !== Progression.Finished)
                            .map(progression => (
                                <Tooltip
                                    key={index + progression}
                                    placement="bottom"
                                    title={
                                        progressionToString(progression) +
                                        ' ' +
                                        calcProgressionStatus(evaluation.progression, progression).toLowerCase()
                                    }
                                >
                                    <span>
                                        <ProgressStatusIcon progression={evaluation.progression} compareProgression={progression} />
                                    </span>
                                </Tooltip>
                            ))}
                    </Centered>
                </CellWithBorder>
                <CellWithBorder>
                    <Centered>
                        <Bowtie answersWithBarrier={answersWithBarrier} isDense />
                    </Centered>
                </CellWithBorder>
                <CellWithBorder>
                    {actionsByState.overdueActions.length > 0 && (
                        <Centered>
                            <span
                                style={{
                                    color: WARNING_COLOR,
                                    paddingRight: '10px',
                                }}
                            >
                                {actionsByState.overdueActions.length}
                            </span>
                            <Icon data={warning_filled} color={WARNING_COLOR} />
                        </Centered>
                    )}
                </CellWithBorder>
                <CellWithBorder>
                    {actionsByState.openActions.length > 0 && <Centered>{actionsByState.openActions.length}</Centered>}
                </CellWithBorder>
                <CellWithBorder>
                    {actionsByState.closedActions.length > 0 && <Centered>{actionsByState.closedActions.length}</Centered>}
                </CellWithBorder>
                <CellWithBorder>
                    <Centered>{new Date(evaluation.createDate).toLocaleDateString()}</Centered>
                </CellWithBorder>
                {
                    evaluation.project.indicatorEvaluationId === evaluation.id ?
                        <CellWithBorder>
                            <Centered>
                                <Icon data={check} color="green" />
                            </Centered>
                        </CellWithBorder>
                        :
                        <CellWithBorder>
                            <Centered>
                            </Centered>
                        </CellWithBorder>
                }
                <CellWithBorder>
                    <Centered>
                        <Icon
                            data={selectedEvaluation && selectedEvaluation.id === evaluation.id ? radio_button_selected : radio_button_unselected}
                            onClick={() => setSelectedEvaluation(selectedEvaluation && selectedEvaluation.id === evaluation.id ? null : evaluation)}
                        />
                    </Centered>
                </CellWithBorder>
                <Cell>
                    <Centered>
                        <Icon
                            data={hiddenEvaluations.includes(evaluation) ? visibility_off : visibility}
                            onClick={() => setHiddenEvaluations(hiddenEvaluations.includes(evaluation) ? hiddenEvaluations.filter(e => e !== evaluation) : [...hiddenEvaluations, evaluation])}
                        />
                    </Centered>
                </Cell>
            </Row>
        )
    }

    return (
        <>
            <SortableTable
                columns={columns}
                data={evaluations}
                sortOnAccessor={sortOnAccessor}
                renderRow={renderRow}
                testId="project-table"
            />
        </>
    )
}

export default EvaluationsTable
